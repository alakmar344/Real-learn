/**
 * Verification script for the RealLearn "Find" knowledge-frontier engine.
 * Exercises the pure brain (lib/knowledgeFrontier.ts) end-to-end with synthetic
 * saved journeys and asserts the mastery map, gap-finding, and recommendations
 * behave deterministically.
 *
 *   Run:  node scripts/verify-frontier.mjs
 *         (or: npm run verify:frontier)
 */
import {
  tokenize,
  normalizeTopic,
  buildFrontier,
  findConnections,
  recommendNext,
  masteryDigest,
} from "../lib/knowledgeFrontier.ts";

let failures = 0;
function check(name, fn) {
  let pass = false;
  try {
    pass = Boolean(fn());
  } catch (err) {
    console.error(`[FAIL] ${name} — threw:`, err?.message ?? err);
    failures++;
    return;
  }
  if (pass) {
    console.log(`  ok  ${name}`);
  } else {
    console.error(`[FAIL] ${name}`);
    failures++;
  }
}

/* ── Journey factory ── */
function journey(id, question, { partsDone = 0, partsTotal = 3, score = 0, savedAt = 0 } = {}) {
  return {
    id,
    question,
    language: "English",
    level: "Class 9-10",
    partScores: {},
    totalScore: score,
    savedAt,
    unlockedPart: partsDone + 1,
    completedParts: Array.from({ length: partsDone }, (_, i) => i + 1),
    partCount: partsTotal,
    quizCount: partsTotal * 2,
  };
}

/* ─────────────── tokenize / normalizeTopic ─────────────── */
console.log("tokenize / normalizeTopic:");
check("tokenize drops stopwords + short tokens", () => {
  const t = tokenize("How does the internet work?");
  return t.includes("internet") && !t.includes("the") && !t.includes("how");
});
check("tokenize dedupes", () => {
  const t = tokenize("gravity gravity gravity");
  return t.length === 1 && t[0] === "gravity";
});
check("normalizeTopic strips question framing", () => normalizeTopic("What is photosynthesis?") === "Photosynthesis");
check("normalizeTopic strips 'how does ... work'", () => normalizeTopic("How does the internet work?").toLowerCase() === "the internet");
check("normalizeTopic handles empty gracefully", () => normalizeTopic("") === "" && normalizeTopic(null) === "");

/* ─────────────── buildFrontier ─────────────── */
console.log("buildFrontier:");
const journeys = [
  journey("j1", "What is gravity?", { partsDone: 3, partsTotal: 3, score: 6, savedAt: 100 }),
  journey("j2", "How does light travel?", { partsDone: 3, partsTotal: 3, score: 4, savedAt: 200 }),
  journey("j3", "What are black holes?", { partsDone: 1, partsTotal: 3, score: 2, savedAt: 300 }),
  journey("j4", "Explain the French Revolution", { partsDone: 3, partsTotal: 3, score: 6, savedAt: 50 }),
];
const frontier = buildFrontier(journeys, ["Physics", "History", "Physics"]);

check("mastered = completed journeys only", () => frontier.mastered.length === 3);
check("inProgress = unfinished journeys", () => frontier.inProgress.length === 1 && frontier.inProgress[0].id === "j3");
check("provenConcepts counts mastered", () => frontier.provenConcepts === 3);
check("subjects deduped", () => frontier.subjects.length === 2 && frontier.subjects.includes("Physics") && frontier.subjects.includes("History"));
check("perfect-score journey is strongest", () => frontier.mastered[0].strength === 1);
check("mastered sorted strongest-first (deterministic)", () => {
  const s = frontier.mastered.map((n) => n.strength);
  return s.every((v, i) => i === 0 || s[i - 1] >= v);
});
check("strength is a 0..1 average", () => frontier.strength > 0 && frontier.strength <= 1);
check("empty input yields empty frontier", () => {
  const f = buildFrontier([], []);
  return f.mastered.length === 0 && f.inProgress.length === 0 && f.strength === 0;
});
check("malformed journeys are filtered out", () => {
  const f = buildFrontier([null, { id: "x" }, { question: "y" }, undefined], []);
  return f.mastered.length === 0 && f.inProgress.length === 0;
});
check("output independent of input order", () => {
  const shuffled = [journeys[2], journeys[0], journeys[3], journeys[1]];
  const a = buildFrontier(journeys, []).mastered.map((n) => n.id).join(",");
  const b = buildFrontier(shuffled, []).mastered.map((n) => n.id).join(",");
  return a === b;
});

/* ─────────────── findConnections ─────────────── */
console.log("findConnections:");
const conn = findConnections("How does gravity affect light near black holes?", frontier);
check("finds proven prerequisites overlapping the goal", () => {
  const topics = conn.prerequisitesKnown.map((n) => n.topic.toLowerCase());
  return topics.some((t) => t.includes("gravity")) && topics.some((t) => t.includes("light"));
});
check("coverage is between 0 and 1", () => conn.coverage >= 0 && conn.coverage <= 1);
check("coverage > 0 when overlap exists", () => conn.coverage > 0);
check("brand-new goal flagged as new territory", () => {
  const c = findConnections("What is the Byzantine tax system?", frontier);
  return c.newTerritory === true && c.prerequisitesKnown.length === 0;
});

/* ─────────────── recommendNext ─────────────── */
console.log("recommendNext:");
const recs = recommendNext(frontier, { limit: 6 });
check("returns recommendations", () => recs.length > 0);
check("resume comes first when something is in progress", () => recs[0].kind === "resume");
check("every recommendation has a reason + question", () => recs.every((r) => r.question && r.reason));
check("no duplicate questions", () => {
  const qs = recs.map((r) => r.question.trim().toLowerCase());
  return new Set(qs).size === qs.length;
});
check("includes a bridge between two mastered topics", () => recs.some((r) => r.kind === "bridge"));
check("respects the limit", () => recommendNext(frontier, { limit: 2 }).length <= 2);
check("cold-start frontier still yields explore starters", () => {
  const cold = recommendNext(buildFrontier([], []));
  return cold.length > 0 && cold.every((r) => r.kind === "explore");
});

/* ─────────────── masteryDigest ─────────────── */
console.log("masteryDigest:");
const digest = masteryDigest(frontier, 2);
check("digest caps to requested size", () => digest.length === 2);
check("digest carries only topic + rounded strength", () =>
  digest.every(
    (d) => typeof d.topic === "string" && typeof d.strength === "number" && d.strength <= 1 && Object.keys(d).length === 2
  ));

/* ─────────────── result ─────────────── */
if (failures === 0) {
  console.log("\nPASS — knowledge-frontier engine verified cleanly.");
  process.exit(0);
} else {
  console.error(`\nFAIL — ${failures} issue(s) found in knowledge-frontier engine.`);
  process.exit(1);
}
