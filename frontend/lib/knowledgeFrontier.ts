// lib/knowledgeFrontier.ts
//
// The brain behind RealLearn "Find" — the feature no generic chatbot can copy.
//
// ChatGPT / Claude answer a question and forget it. RealLearn is different: every
// quiz you pass is a *proof* that you truly learned something. This module turns
// that pile of quiz-verified journeys into a private "knowledge frontier" — a map
// of what you have genuinely PROVEN you know — and uses it to recommend the single
// best next thing to learn, find the prerequisite gaps behind a goal, and surface
// the surprising bridges between two things you already mastered.
//
// The moat: these recommendations are computed from YOUR verified mastery, which
// only exists because of RealLearn's quiz-gated design. A model that never tested
// you has no idea what you actually know — so it cannot reproduce this. The map
// gets richer with every lesson, so the reason to stay compounds.
//
// Everything here is PURE and deterministic (no Date.now / Math.random / network)
// so it can be unit-tested in isolation (see scripts/verify-frontier.mjs) and run
// fully on-device — no lesson content ever has to leave the browser.

import type { SavedJourney } from "@/types";

/* ────────────────────────────── Types ────────────────────────────── */

/** A single thing the learner has engaged with, scored by verified mastery. */
export interface MasteryNode {
  id: string;
  /** Cleaned, human-facing label derived from the original question. */
  topic: string;
  /** The raw question the learner originally asked. */
  question: string;
  /** 0..1 verified mastery strength (blends completion + quiz score). */
  strength: number;
  /** True when every part was completed (quiz-gated to 100%). */
  completed: boolean;
  partsDone: number;
  partsTotal: number;
  score: number;
  maxScore: number;
  /** Content tokens of the topic, used for gap / connection matching. */
  tokens: string[];
  savedAt: number;
}

export interface Frontier {
  /** Fully completed journeys, strongest first — what you've PROVEN. */
  mastered: MasteryNode[];
  /** Started but not finished — your live learning edge. */
  inProgress: MasteryNode[];
  /** Count of concepts proven via quiz. */
  provenConcepts: number;
  /** Distinct subjects touched (from the progress store). */
  subjects: string[];
  /** Overall mastery strength across completed work, 0..1. */
  strength: number;
}

export type RecommendationKind = "resume" | "bridge" | "deepen" | "explore";

export interface Recommendation {
  kind: RecommendationKind;
  /** The suggested question to launch. */
  question: string;
  /** Short, human explanation of WHY this is recommended for this learner. */
  reason: string;
  /** Ids of the mastery nodes this recommendation is derived from. */
  sourceIds: string[];
}

export interface Connections {
  /** The cleaned goal the learner asked to understand. */
  goal: string;
  /** Mastered topics that share concepts with the goal — proven prerequisites. */
  prerequisitesKnown: MasteryNode[];
  /** True when nothing in the frontier overlaps the goal (brand-new territory). */
  newTerritory: boolean;
  /** 0..1 how much of the goal your proven knowledge already covers. */
  coverage: number;
}

/* ─────────────────────────── Text helpers ─────────────────────────── */

// Small, deterministic stopword list. Deliberately minimal — the goal is only
// to keep topic matching meaningful, not to do real NLP.
const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "with", "was", "how",
  "why", "what", "who", "does", "did", "can", "could", "would", "should", "into",
  "from", "that", "this", "these", "those", "than", "then", "them", "they", "its",
  "explain", "tell", "give", "about", "between", "difference", "example", "examples",
  "work", "works", "working", "mean", "means", "meaning", "define", "definition",
  "understand", "learn", "learning", "basics", "basic", "intro", "introduction",
]);

/** Lowercase, split on non-alphanumerics, drop stopwords + very short tokens. */
export function tokenize(text: string): string[] {
  if (typeof text !== "string") return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    const t = raw.trim();
    if (t.length < 3) continue;
    if (STOPWORDS.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Turn a raw question into a tidy topic label: strip common question framing
 * ("what is ...?", "how does ... work") and trailing punctuation so the map
 * reads as a clean list of concepts rather than a list of questions.
 */
export function normalizeTopic(question: string): string {
  if (typeof question !== "string") return "";
  let s = question.replace(/\s+/g, " ").trim();
  // Drop a leading interrogative frame.
  s = s.replace(
    /^(what\s+(is|are|was|were)|how\s+(do|does|did|can|to)|why\s+(do|does|did|is|are)|who\s+(is|are|was)|when\s+(do|does|did|is|was)|where\s+(is|are|do|does)|explain|define|describe|tell me about)\b[\s:,-]*/i,
    ""
  );
  // Drop trailing question/period punctuation and the trailing "work".
  s = s.replace(/[\s?.!,;:]+$/g, "");
  s = s.replace(/\s+work(s|ing)?$/i, "");
  s = s.trim();
  if (!s) s = question.replace(/[?.!]+$/g, "").trim();
  // Sentence-case the first letter for a cleaner chip label.
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/* ───────────────────────── Frontier building ──────────────────────── */

function toNode(journey: SavedJourney): MasteryNode {
  const partsTotal =
    journey.lesson?.parts?.length ?? journey.partCount ?? 3;
  const completedParts = Array.isArray(journey.completedParts)
    ? journey.completedParts
    : [];
  const partsDone = Math.min(completedParts.length, partsTotal);
  // Max score mirrors the sidebar's derivation: 2 questions per part by default.
  const quizCountFromParts = (journey.lesson?.parts ?? []).reduce(
    (sum, p) => sum + (p.quiz?.length ?? 2),
    0
  );
  const maxScore = journey.quizCount ?? (quizCountFromParts || partsTotal * 2);
  const score = Number.isFinite(journey.totalScore) ? journey.totalScore : 0;
  const completed = partsTotal > 0 && partsDone >= partsTotal;

  // Verified strength: weight the quiz score more heavily than mere progress,
  // because passing the quiz is the actual proof of learning.
  const completionRatio = partsTotal > 0 ? partsDone / partsTotal : 0;
  const scoreRatio = maxScore > 0 ? score / maxScore : 0;
  const strength = clamp01(0.4 * completionRatio + 0.6 * scoreRatio);

  const topic = normalizeTopic(journey.question);
  return {
    id: journey.id,
    topic,
    question: journey.question,
    strength,
    completed,
    partsDone,
    partsTotal,
    score,
    maxScore,
    tokens: tokenize(topic || journey.question),
    savedAt: Number.isFinite(journey.savedAt) ? journey.savedAt : 0,
  };
}

// Stable, deterministic ordering: strongest first, then most recent, then id so
// the output never depends on input order (important for reproducible tests).
function byStrengthThenRecency(a: MasteryNode, b: MasteryNode): number {
  if (b.strength !== a.strength) return b.strength - a.strength;
  if (b.savedAt !== a.savedAt) return b.savedAt - a.savedAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Build the learner's knowledge frontier from their saved journeys plus the
 * distinct subjects the progress store has recorded.
 */
export function buildFrontier(
  journeys: SavedJourney[] = [],
  subjectsSeen: string[] = []
): Frontier {
  const nodes = (Array.isArray(journeys) ? journeys : [])
    .filter((j) => j && typeof j.id === "string" && typeof j.question === "string")
    .map(toNode);

  const mastered = nodes.filter((n) => n.completed).sort(byStrengthThenRecency);
  const inProgress = nodes
    .filter((n) => !n.completed)
    .sort((a, b) => {
      // Live edge = most recent first (resume what you were doing).
      if (b.savedAt !== a.savedAt) return b.savedAt - a.savedAt;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  const strength =
    mastered.length > 0
      ? mastered.reduce((sum, n) => sum + n.strength, 0) / mastered.length
      : 0;

  const subjects = Array.from(
    new Set((Array.isArray(subjectsSeen) ? subjectsSeen : []).filter(Boolean))
  );

  return {
    mastered,
    inProgress,
    provenConcepts: mastered.length,
    subjects,
    strength: clamp01(strength),
  };
}

/* ─────────────────────── Goal → prerequisite gaps ─────────────────── */

/**
 * Given a goal ("I want to understand black holes"), find which parts of it the
 * learner has already PROVEN they know, and whether it's brand-new territory.
 * This is the "Find my gaps" surface: it turns a goal into a personalized map of
 * what you can lean on and what is genuinely new.
 */
export function findConnections(goal: string, frontier: Frontier): Connections {
  const cleanGoal = normalizeTopic(goal);
  const goalTokens = new Set(tokenize(cleanGoal || goal));
  const pool = [...frontier.mastered, ...frontier.inProgress];

  const scored = pool
    .map((node) => {
      let overlap = 0;
      for (const t of node.tokens) if (goalTokens.has(t)) overlap++;
      return { node, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return byStrengthThenRecency(a.node, b.node);
    });

  const prerequisitesKnown = scored
    .filter((x) => x.node.completed)
    .map((x) => x.node);

  // Coverage = fraction of the goal's distinct concepts already matched by
  // something the learner has touched.
  const matchedTokens = new Set<string>();
  for (const { node } of scored) {
    for (const t of node.tokens) if (goalTokens.has(t)) matchedTokens.add(t);
  }
  const coverage =
    goalTokens.size > 0 ? matchedTokens.size / goalTokens.size : 0;

  return {
    goal: cleanGoal || goal.trim(),
    prerequisitesKnown,
    newTerritory: scored.length === 0,
    coverage: clamp01(coverage),
  };
}

/* ─────────────────────── Next-step recommendations ────────────────── */

export interface RecommendOptions {
  /** Max recommendations to return. */
  limit?: number;
}

/**
 * The daily "what should I learn next" engine. Deterministic and explainable —
 * every recommendation carries a reason grounded in the learner's own frontier:
 *
 *  • resume   — you started this; finish it.
 *  • bridge   — you mastered A and B; discover how they connect.
 *  • deepen   — you proved the basics; go a level deeper.
 *  • explore  — a fresh starter when the frontier is empty.
 */
export function recommendNext(
  frontier: Frontier,
  options: RecommendOptions = {}
): Recommendation[] {
  const limit = Math.max(1, Math.min(12, options.limit ?? 5));
  const out: Recommendation[] = [];
  const seen = new Set<string>();

  const push = (rec: Recommendation) => {
    const key = rec.question.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(rec);
  };

  // 1) Resume anything left unfinished — the highest-intent action.
  for (const node of frontier.inProgress.slice(0, 3)) {
    push({
      kind: "resume",
      question: node.question,
      reason: `Pick up where you left off — you're ${node.partsDone}/${node.partsTotal} through this.`,
      sourceIds: [node.id],
    });
  }

  // 2) Bridge the two strongest mastered topics — the serendipity engine no
  //    generic chatbot offers, because it needs YOUR proven map.
  if (frontier.mastered.length >= 2) {
    const [a, b] = frontier.mastered;
    push({
      kind: "bridge",
      question: `How does ${a.topic} connect to ${b.topic}?`,
      reason: `You've proven both ${a.topic} and ${b.topic} — discover the surprising bridge between them.`,
      sourceIds: [a.id, b.id],
    });
  }

  // 3) Deepen the strongest mastered topics.
  for (const node of frontier.mastered.slice(0, 3)) {
    push({
      kind: "deepen",
      question: `Go deeper into the advanced side of ${node.topic}`,
      reason: `You've proven the fundamentals of ${node.topic} — ready for the next level.`,
      sourceIds: [node.id],
    });
  }

  // 4) Cold start — no history yet. Offer evergreen starters so the surface is
  //    never empty.
  if (out.length === 0) {
    const starters = [
      "How does the internet actually work?",
      "What is compound interest and why does it matter?",
      "How do black holes form?",
    ];
    for (const q of starters) {
      push({
        kind: "explore",
        question: q,
        reason: "A great first journey — pass the quiz and it becomes part of your proven map.",
        sourceIds: [],
      });
    }
  }

  return out.slice(0, limit);
}

/**
 * Compact, network-safe projection of the frontier's mastered topics for the
 * optional backend "discover related" call. Only coarse topic labels + strength
 * leave the device — never full lesson content.
 */
export function masteryDigest(
  frontier: Frontier,
  limit = 20
): { topic: string; strength: number }[] {
  return frontier.mastered.slice(0, Math.max(0, limit)).map((n) => ({
    topic: n.topic,
    strength: Math.round(n.strength * 100) / 100,
  }));
}
