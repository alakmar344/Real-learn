// lib/learningProfile.ts
//
// The internal personalization layer behind RealLearn's quiz-gated lessons.
//
// Every quiz the learner passes is *proof* they learned something. This module
// turns that pile of quiz-verified journeys into a COMPACT proficiency profile:
// a small map of what the learner has genuinely proven they know, what they're
// partway through, where they struggle, and where their confidence is low.
//
// Unlike the old standalone "Find" page (which surfaced this map for the learner
// to browse and manage), the profile now lives entirely in the background. It is
// never shown as a page. Instead, a tiny topic-relevant context snippet is
// generated on demand for each AI question and attached to the lesson request,
// so the AI answer is personalized to the learner's *verified* knowledge without
// sending the whole history (data minimization).
//
// Design goals:
//  - PURE and deterministic (no Date.now / Math.random / network) so it can be
//    unit-tested in isolation and run fully on-device.
//  - REUSES knowledgeFrontier.ts primitives (tokenize, normalizeTopic) so there
//    is a single source of truth for topic cleaning and strength semantics.
//  - COMPACT: the on-device profile is a digest of topic labels + a 0..1
//    strength and a bucket. Only the tiny, topic-relevant context snippet ever
//    leaves the device, and even that is token-budgeted.
//
// Trust model:
//  - The profile is derived from the learner's OWN saved journeys on their OWN
//    device. The context snippet is sent with a lesson request to tailor the
//    answer; the backend treats it as DESCRIPTIVE DATA (never instructions) and
//    fences + neutralizes it exactly like learner notes.

import { tokenize, normalizeTopic } from "@/lib/knowledgeFrontier";
import type { SavedJourney } from "@/types";

/* ─────────────────────────────────────────────────────────────── Types ──── */

/**
 * A single topic the learner has engaged with, scored by verified proficiency.
 * This is the compact on-device record — deliberately small (no lesson content,
 * no full question history) so the profile stays cheap to build and store.
 */
export interface ProficiencyNode {
  id: string;
  /** Cleaned, human-facing label derived from the original question. */
  topic: string;
  /** 0..1 verified proficiency (blends completion + quiz score). */
  strength: number;
  /** Bucket classification derived from strength + completion. */
  bucket: ProficiencyBucket;
  /** True when every part was completed (quiz-gated to 100%). */
  completed: boolean;
  /** Content tokens of the topic, used for relevance matching. */
  tokens: string[];
  /** Epoch ms the journey was saved (for recency, never sent off-device). */
  savedAt: number;
}

export type ProficiencyBucket =
  | "well-understood"
  | "partially-understood"
  | "struggling"
  | "low-confidence";

/**
 * The compact proficiency profile. Built deterministically from saved journeys
 * + the subjects the progress store has recorded. This object stays on-device;
 * only a tiny topic-relevant slice ever leaves via `buildLearningContext`.
 */
export interface LearningProfile {
  /** Topics the learner has proven strong mastery of. */
  wellUnderstood: ProficiencyNode[];
  /** Topics the learner has partial grasp of. */
  partiallyUnderstood: ProficiencyNode[];
  /** Topics the learner attempted but scored poorly on. */
  struggling: ProficiencyNode[];
  /** Topics the learner started but barely engaged (low signal). */
  lowConfidence: ProficiencyNode[];
  /** Distinct subjects touched (from the progress store). */
  subjects: string[];
  /** Total number of quiz-verified concepts (completed journeys). */
  provenConcepts: number;
  /** Overall proficiency across completed work, 0..1. */
  strength: number;
}

/* ─────────────────────────────────────────────────────────── Helpers ─────── */

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Compute the verified strength of a journey, mirroring knowledgeFrontier's
 * toNode: weight the quiz score more heavily than mere progress, because
 * passing the quiz is the actual proof of learning.
 *
 * strength = 0.4 * completionRatio + 0.6 * scoreRatio
 */
export function journeyStrength(journey: SavedJourney): number {
  const partsTotal = journey.lesson?.parts?.length ?? journey.partCount ?? 3;
  const completedParts = Array.isArray(journey.completedParts)
    ? journey.completedParts
    : [];
  const partsDone = Math.min(completedParts.length, partsTotal);
  const quizCountFromParts = (journey.lesson?.parts ?? []).reduce(
    (sum, p) => sum + (p.quiz?.length ?? 2),
    0
  );
  const maxScore = journey.quizCount ?? (quizCountFromParts || partsTotal * 2);
  const score = Number.isFinite(journey.totalScore) ? journey.totalScore : 0;

  const completionRatio = partsTotal > 0 ? partsDone / partsTotal : 0;
  const scoreRatio = maxScore > 0 ? score / maxScore : 0;
  return clamp01(0.4 * completionRatio + 0.6 * scoreRatio);
}

/**
 * Classify a journey into a proficiency bucket using its strength and whether
 * the learner completed all parts.
 *
 *  - well-understood: completed AND strong (>= 0.7)
 *  - partially-understood: meaningful signal, not yet strong (0.4 .. < 0.7)
 *  - struggling: engaged (completed or a real quiz score) but weak (< 0.4)
 *  - low-confidence: barely engaged (incomplete AND little/no quiz signal)
 */
export function classifyBucket(
  journey: SavedJourney,
  strength: number
): ProficiencyBucket {
  const partsTotal = journey.lesson?.parts?.length ?? journey.partCount ?? 3;
  const completedParts = Array.isArray(journey.completedParts)
    ? journey.completedParts
    : [];
  const partsDone = Math.min(completedParts.length, partsTotal);
  const completed = partsTotal > 0 && partsDone >= partsTotal;
  const hasQuizSignal = strength > 0.05 || completed;

  if (completed && strength >= 0.7) return "well-understood";
  if (strength >= 0.4) return "partially-understood";
  if (hasQuizSignal && strength < 0.4) return "struggling";
  return "low-confidence";
}

function toNode(journey: SavedJourney): ProficiencyNode {
  const strength = journeyStrength(journey);
  const topic = normalizeTopic(journey.question);
  return {
    id: journey.id,
    topic,
    strength,
    bucket: classifyBucket(journey, strength),
    completed:
      (journey.lesson?.parts?.length ?? journey.partCount ?? 3) > 0 &&
      (Array.isArray(journey.completedParts) ? journey.completedParts : [])
        .length >= (journey.lesson?.parts?.length ?? journey.partCount ?? 3),
    tokens: tokenize(topic || journey.question),
    savedAt: Number.isFinite(journey.savedAt) ? journey.savedAt : 0,
  };
}

// Stable, deterministic ordering: strongest first, then most recent, then id.
function byStrengthThenRecency(a: ProficiencyNode, b: ProficiencyNode): number {
  if (b.strength !== a.strength) return b.strength - a.strength;
  if (b.savedAt !== a.savedAt) return b.savedAt - a.savedAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/* ─────────────────────────────────────────────────── Profile building ────── */

/**
 * Build the learner's compact proficiency profile from their saved journeys
 * plus the distinct subjects the progress store has recorded.
 *
 * Deterministic: the output never depends on input array order (nodes are
 * sorted by a stable key) so it is reproducible in tests.
 */
export function buildLearningProfile(
  journeys: SavedJourney[] = [],
  subjectsSeen: string[] = []
): LearningProfile {
  const nodes = (Array.isArray(journeys) ? journeys : [])
    .filter(
      (j) => j && typeof j.id === "string" && typeof j.question === "string"
    )
    .map(toNode);

  const wellUnderstood: ProficiencyNode[] = [];
  const partiallyUnderstood: ProficiencyNode[] = [];
  const struggling: ProficiencyNode[] = [];
  const lowConfidence: ProficiencyNode[] = [];

  for (const node of nodes) {
    switch (node.bucket) {
      case "well-understood":
        wellUnderstood.push(node);
        break;
      case "partially-understood":
        partiallyUnderstood.push(node);
        break;
      case "struggling":
        struggling.push(node);
        break;
      case "low-confidence":
        lowConfidence.push(node);
        break;
    }
  }

  wellUnderstood.sort(byStrengthThenRecency);
  partiallyUnderstood.sort(byStrengthThenRecency);
  struggling.sort(byStrengthThenRecency);
  // Low-confidence: most recent first (what they just touched but barely did).
  lowConfidence.sort((a, b) => {
    if (b.savedAt !== a.savedAt) return b.savedAt - a.savedAt;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const completed = nodes.filter((n) => n.completed);
  const strength =
    completed.length > 0
      ? completed.reduce((sum, n) => sum + n.strength, 0) / completed.length
      : 0;

  const subjects = Array.from(
    new Set((Array.isArray(subjectsSeen) ? subjectsSeen : []).filter(Boolean))
  );

  return {
    wellUnderstood,
    partiallyUnderstood,
    struggling,
    lowConfidence,
    subjects,
    provenConcepts: completed.length,
    strength: clamp01(strength),
  };
}

/* ───────────────────────────────────────────── Context generation ────────── */

/** Hard cap on the number of topic labels per bucket in the context snippet. */
const MAX_TOPICS_PER_BUCKET = 4;

/**
 * Rough per-token estimate used to budget the context snippet. We approximate
 * ~5 characters per token (English average) and keep the snippet well under a
 * few hundred characters so it costs almost nothing per request.
 */
const MAX_CONTEXT_CHARS = 480;

/**
 * Relevance score of a proficiency node to the current question: how many of
 * the node's tokens appear in the question's tokens. Higher overlap = more
 * relevant context to surface.
 */
function relevance(node: ProficiencyNode, questionTokens: Set<string>): number {
  let overlap = 0;
  for (const t of node.tokens) if (questionTokens.has(t)) overlap += 1;
  return overlap;
}

interface BucketDescriptor {
  label: string;
  nodes: ProficiencyNode[];
  /** When true, this bucket is only surfaced if it is relevant to the question. */
  onlyIfRelevant: boolean;
}

/**
 * Generate a small, topic-relevant learning-context snippet for the AI. Only
 * the areas relevant to the current question's tokens are included, and the
 * whole snippet is char-budgeted so it costs almost nothing per request.
 *
 * The snippet is plain, descriptive prose — e.g.
 *   "User knowledge context: Strong in algebraic identities, moderate in
 *    factorisation, weak in quadratic equations; building on algebra."
 * It is NOT a list of instructions; the backend fences + neutralizes it and
 * frames it as DESCRIPTIVE DATA (same trust model as learner notes).
 *
 * Returns null when there is no meaningful profile yet (cold start), so the
 * caller can simply skip attaching the field.
 */
export function buildLearningContext(
  journeys: SavedJourney[] = [],
  subjectsSeen: string[] = [],
  currentQuestion: string = ""
): string | null {
  const profile = buildLearningProfile(journeys, subjectsSeen);

  const total =
    profile.wellUnderstood.length +
    profile.partiallyUnderstood.length +
    profile.struggling.length +
    profile.lowConfidence.length;
  if (total === 0) return null;

  const questionTokens = new Set(tokenize(normalizeTopic(currentQuestion) || currentQuestion));
  const hasQuestion = questionTokens.size > 0;

  const descriptors: BucketDescriptor[] = [
    { label: "strong in", nodes: profile.wellUnderstood, onlyIfRelevant: false },
    { label: "moderate in", nodes: profile.partiallyUnderstood, onlyIfRelevant: false },
    { label: "weak in", nodes: profile.struggling, onlyIfRelevant: true },
    { label: "still building confidence in", nodes: profile.lowConfidence, onlyIfRelevant: true },
  ];

  const phrases: string[] = [];

  for (const desc of descriptors) {
    if (desc.nodes.length === 0) continue;

    // Pick relevant nodes first (by overlap then strength), falling back to the
    // strongest overall when the question has no overlap with this learner yet.
    const ranked = desc.nodes
      .map((n) => ({ n, r: relevance(n, questionTokens) }))
      .sort((a, b) => {
        if (b.r !== a.r) return b.r - a.r;
        return byStrengthThenRecency(a.n, b.n);
      });

    // When there is a question, only surface a bucket if it has at least one
    // relevant node OR the bucket is always allowed (strong/moderate give useful
    // background even without a direct hit). This keeps the snippet focused.
    const relevantCount = ranked.filter((x) => x.r > 0).length;
    if (hasQuestion && desc.onlyIfRelevant && relevantCount === 0) continue;

    const picked = ranked
      .slice(0, MAX_TOPICS_PER_BUCKET)
      .map((x) => x.n.topic)
      .filter(Boolean);
    if (picked.length === 0) continue;

    phrases.push(`${desc.label} ${joinTopics(picked)}`);
  }

  if (phrases.length === 0) return null;

  let snippet = `User knowledge context: ${phrases.join("; ")}.`;
  if (snippet.length > MAX_CONTEXT_CHARS) {
    snippet = snippet.slice(0, MAX_CONTEXT_CHARS - 1).replace(/[,;]?\s*\S*$/, "") + ".";
  }
  return snippet;
}

/** Join topic labels with commas and an "and" before the last item. */
function joinTopics(topics: string[]): string {
  if (topics.length === 1) return topics[0];
  if (topics.length === 2) return `${topics[0]} and ${topics[1]}`;
  return `${topics.slice(0, -1).join(", ")}, and ${topics[topics.length - 1]}`;
}

/* ───────────────────────────────────────────────────── Compact digest ────── */

/**
 * Compact, network-safe projection of the profile for any future use that needs
 * a structured digest (the AI context path uses buildLearningContext instead).
 * Only coarse topic labels + bucket + strength leave the device — never full
 * lesson content or raw quiz data.
 */
export function profileDigest(
  profile: LearningProfile,
  limit = 20
): {
  topic: string;
  bucket: ProficiencyBucket;
  strength: number;
}[] {
  const cap = Math.max(0, limit);
  return [
    ...profile.wellUnderstood,
    ...profile.partiallyUnderstood,
    ...profile.struggling,
    ...profile.lowConfidence,
  ]
    .sort(byStrengthThenRecency)
    .slice(0, cap)
    .map((n) => ({
      topic: n.topic,
      bucket: n.bucket,
      strength: Math.round(n.strength * 100) / 100,
    }));
}
