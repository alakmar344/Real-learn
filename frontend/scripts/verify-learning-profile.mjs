/**
 * Verification script for the RealLearn learning-profile engine
 * (lib/learningProfile.ts) — the internal personalization layer that replaced
 * the standalone "Find" page.
 *
 * Exercises the pure brain with synthetic saved journeys and asserts:
 *  - journeyStrength mirrors knowledgeFrontier's 0.4*completion + 0.6*score
 *  - classifyBucket buckets correctly across all four buckets
 *  - buildLearningProfile is deterministic, stable, and filters junk
 *  - buildLearningContext is compact, topic-relevant, null on cold start
 *  - profileDigest is a compact network-safe projection
 *
 *   Run:  node scripts/verify-learning-profile.mjs
 *         (or: npm run verify:profile)
 */
import {
  journeyStrength,
  classifyBucket,
  buildLearningProfile,
  buildLearningContext,
  profileDigest,
} from "../lib/learningProfile.ts";

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

/* ── Journey factory (mirrors verify-frontier.mjs shape) ── */
function journey(id, question, { partsDone = 0, partsTotal = 3, score = 0, savedAt = 0, quizCount } = {}) {
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
    quizCount: quizCount ?? partsTotal * 2,
  };
}

/* ─────────────────────── journeyStrength ─────────────────────── */
console.log("journeyStrength:");
check("perfect completed journey → strength 1", () => {
  const j = journey("j", "What is gravity?", { partsDone: 3, partsTotal: 3, score: 6, quizCount: 6 });
  return journeyStrength(j) === 1;
});
check("blends 0.4*completion + 0.6*score", () => {
  // 2/3 parts done (completion 0.6667), score 3/6 (scoreRatio 0.5)
  // strength = 0.4*0.6667 + 0.6*0.5 = 0.2667 + 0.3 = 0.5667
  const j = journey("j", "What is gravity?", { partsDone: 2, partsTotal: 3, score: 3, quizCount: 6 });
  const s = journeyStrength(j);
  return Math.abs(s - (0.4 * (2 / 3) + 0.6 * 0.5)) < 0.01;
});
check("zero progress + zero score → 0", () => {
  const j = journey("j", "What is gravity?", { partsDone: 0, partsTotal: 3, score: 0, quizCount: 6 });
  return journeyStrength(j) === 0;
});
check("clamps to [0,1]", () => {
  const j = journey("j", "What is gravity?", { partsDone: 3, partsTotal: 3, score: 999, quizCount: 6 });
  return journeyStrength(j) === 1;
});

/* ─────────────────────── classifyBucket ─────────────────────── */
console.log("classifyBucket:");
check("completed + strong → well-understood", () => {
  const j = journey("j", "What is gravity?", { partsDone: 3, partsTotal: 3, score: 6, quizCount: 6 });
  return classifyBucket(j, 1) === "well-understood";
});
check("completed + moderate (0.4-0.7) → partially-understood", () => {
  const j = journey("j", "What is gravity?", { partsDone: 3, partsTotal: 3, score: 4, quizCount: 6 });
  // strength = 0.4*1 + 0.6*(4/6) = 0.4 + 0.4 = 0.8 → actually well-understood
  // Use a lower score to force partially-understood: score 2/6 → 0.4+0.2=0.6
  const j2 = journey("j", "What is gravity?", { partsDone: 3, partsTotal: 3, score: 2, quizCount: 6 });
  return classifyBucket(j2, 0.6) === "partially-understood";
});
check("engaged + weak → struggling", () => {
  // completed but very low score: strength = 0.4*1 + 0.6*0 = 0.4 → boundary
  // Use incomplete with some score: 1/3 parts, score 1/6 → 0.4*0.333+0.6*0.1667=0.233
  const j = journey("j", "What is gravity?", { partsDone: 1, partsTotal: 3, score: 1, quizCount: 6 });
  return classifyBucket(j, 0.23) === "struggling";
});
check("barely engaged → low-confidence", () => {
  // 0 parts done, 0 score → strength 0, no quiz signal, not completed
  const j = journey("j", "What is gravity?", { partsDone: 0, partsTotal: 3, score: 0, quizCount: 6 });
  return classifyBucket(j, 0) === "low-confidence";
});

/* ─────────────────────── buildLearningProfile ─────────────────────── */
console.log("buildLearningProfile:");
const journeys = [
  journey("j1", "What is gravity?", { partsDone: 3, partsTotal: 3, score: 6, savedAt: 100 }), // well-understood
  journey("j2", "How does light travel?", { partsDone: 3, partsTotal: 3, score: 2, savedAt: 200 }), // partially (0.6)
  journey("j3", "What are black holes?", { partsDone: 1, partsTotal: 3, score: 1, savedAt: 300 }), // struggling
  journey("j4", "Explain the French Revolution", { partsDone: 0, partsTotal: 3, score: 0, savedAt: 50 }), // low-confidence
];
const profile = buildLearningProfile(journeys, ["Physics", "History", "Physics"]);

check("well-understood has the strong completed journey", () =>
  profile.wellUnderstood.length === 1 && profile.wellUnderstood[0].id === "j1");
check("provenConcepts counts completed journeys", () => profile.provenConcepts === 2);
check("subjects deduped", () =>
  profile.subjects.length === 2 &&
  profile.subjects.includes("Physics") &&
  profile.subjects.includes("History"));
check("strength is a 0..1 average of completed", () =>
  profile.strength > 0 && profile.strength <= 1);
check("each node carries bucket + topic + tokens", () =>
  profile.wellUnderstood.every(
    (n) => typeof n.topic === "string" && Array.isArray(n.tokens) && typeof n.bucket === "string"
  ));
check("empty input yields empty profile", () => {
  const p = buildLearningProfile([], []);
  return (
    p.wellUnderstood.length === 0 &&
    p.partiallyUnderstood.length === 0 &&
    p.struggling.length === 0 &&
    p.lowConfidence.length === 0 &&
    p.provenConcepts === 0 &&
    p.strength === 0
  );
});
check("malformed journeys are filtered out", () => {
  const p = buildLearningProfile([null, { id: "x" }, { question: "y" }, undefined], []);
  return (
    p.wellUnderstood.length === 0 &&
    p.partiallyUnderstood.length === 0 &&
    p.struggling.length === 0 &&
    p.lowConfidence.length === 0
  );
});
check("output is independent of input order (deterministic)", () => {
  const shuffled = [journeys[2], journeys[0], journeys[3], journeys[1]];
  const a = buildLearningProfile(journeys, ["Physics"]).wellUnderstood.map((n) => n.id).join(",");
  const b = buildLearningProfile(shuffled, ["Physics"]).wellUnderstood.map((n) => n.id).join(",");
  return a === b;
});

/* ─────────────────────── buildLearningContext ─────────────────────── */
console.log("buildLearningContext:");
check("null on cold start (no journeys)", () => {
  return buildLearningContext([], [], "What is gravity?") === null;
});
check("returns compact prose snippet", () => {
  const ctx = buildLearningContext(journeys, ["Physics"], "What is gravity?");
  return typeof ctx === "string" && ctx.startsWith("User knowledge context:") && ctx.endsWith(".");
});
check("snippet is char-budgeted (<= ~500 chars)", () => {
  const many = Array.from({ length: 60 }, (_, i) =>
    journey(`m${i}`, `Topic number ${i} explanation`, { partsDone: 3, partsTotal: 3, score: 6, savedAt: i })
  );
  const ctx = buildLearningContext(many, ["Math"], "Topic number 5 explanation");
  return typeof ctx === "string" && ctx.length <= 520;
});
check("surfaces strong areas even without question overlap", () => {
  const ctx = buildLearningContext(journeys, ["Physics"], "What is the Byzantine tax system?");
  // strong (gravity) is always allowed; weak/low-confidence only if relevant
  return typeof ctx === "string" && /strong in/i.test(ctx);
});
check("weak/low-confidence only surfaced when relevant to the question", () => {
  // black holes is "struggling" — only appears if the question overlaps
  const relevant = buildLearningContext(journeys, ["Physics"], "What are black holes?");
  const irrelevant = buildLearningContext(journeys, ["Physics"], "What is the Byzantine tax system?");
  return (
    typeof relevant === "string" &&
    /weak in/i.test(relevant) &&
    typeof irrelevant === "string" &&
    !/weak in/i.test(irrelevant)
  );
});
check("deterministic — same inputs → same output", () => {
  const a = buildLearningContext(journeys, ["Physics"], "What is gravity?");
  const b = buildLearningContext(journeys, ["Physics"], "What is gravity?");
  return a === b;
});

/* ─────────────────────── profileDigest ─────────────────────── */
console.log("profileDigest:");
check("returns compact {topic, bucket, strength} array", () => {
  const digest = profileDigest(profile, 10);
  return (
    Array.isArray(digest) &&
    digest.length > 0 &&
    digest.every(
      (d) =>
        typeof d.topic === "string" &&
        typeof d.bucket === "string" &&
        typeof d.strength === "number" &&
        Object.keys(d).length === 3
    )
  );
});
check("respects the limit", () => {
  const digest = profileDigest(profile, 2);
  return digest.length === 2;
});
check("empty profile → empty digest", () => {
  const digest = profileDigest(buildLearningProfile([], []), 10);
  return digest.length === 0;
});

/* ─────────────────────── result ─────────────────────── */
if (failures === 0) {
  console.log("\nPASS — learning-profile engine verified cleanly.");
  process.exit(0);
} else {
  console.error(`\nFAIL — ${failures} issue(s) found in learning-profile engine.`);
  process.exit(1);
}
