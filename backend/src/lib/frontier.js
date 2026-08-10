// lib/frontier.js
//
// Server-side helpers for the "Find" feature — RealLearn's uncopyable moat.
//
// The client computes a learner's private knowledge frontier entirely on-device
// (frontend/lib/knowledgeFrontier.ts). This module powers the OPTIONAL "discover
// related" enrichment: given the learner's coarse mastered-topic labels + an
// optional goal, it ranks lessons OTHER learners have already explored (from the
// shared lesson cache, via the previously-dormant text index in searchIndex.js)
// while filtering out anything the learner has already proven.
//
// Privacy: only coarse topic strings + strengths ever reach the server, and this
// module stores NOTHING. It is pure and deterministic so it can be unit-tested
// without a database (see backend/test/frontier.test.js).

const MAX_TOPICS = 40;
const MAX_TOPIC_LEN = 120;
const DEFAULT_DISCOVER_LIMIT = 6;
const MAX_DISCOVER_LIMIT = 12;

/** Lowercase, split on non-alphanumerics, drop 1–2 char noise tokens. */
export function frontierTokens(text) {
  if (typeof text !== "string") return [];
  const out = new Set();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length >= 3) out.add(raw);
  }
  return [...out];
}

/**
 * Validate + normalize the mastered-topics payload the client sends. Rejects
 * anything that isn't a plausible {topic, strength} pair, trims strings, clamps
 * strength to 0..1, and caps the array so a malicious client can't send a
 * megabyte of "topics".
 */
export function sanitizeMasteryTopics(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of input) {
    if (out.length >= MAX_TOPICS) break;
    let topic;
    let strength = 0;
    if (typeof raw === "string") {
      topic = raw;
    } else if (raw && typeof raw === "object") {
      topic = raw.topic;
      strength = raw.strength;
    } else {
      continue;
    }
    if (typeof topic !== "string") continue;
    const clean = topic
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
      .replace(/[<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TOPIC_LEN);
    if (clean.length < 2) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const s = Number(strength);
    out.push({
      topic: clean,
      strength: Number.isFinite(s) ? Math.max(0, Math.min(1, s)) : 0,
    });
  }
  return out;
}

export function clampDiscoverLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DISCOVER_LIMIT;
  return Math.min(Math.floor(parsed), MAX_DISCOVER_LIMIT);
}

/**
 * Build the text-search query for the discover call. Prefer the learner's goal;
 * otherwise fall back to their strongest mastered topics so "what's next" still
 * has something to search on. Returns "" when there's nothing to search.
 */
export function buildDiscoverQuery(goal, masteredTopics) {
  const cleanGoal = typeof goal === "string" ? goal.trim() : "";
  if (cleanGoal.length >= 2) return cleanGoal.slice(0, 160);
  const top = (Array.isArray(masteredTopics) ? masteredTopics : [])
    .slice()
    .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0))
    .slice(0, 5)
    .map((t) => t.topic)
    .join(" ");
  return top.slice(0, 160);
}

/**
 * Rank raw search results into discovery cards, dropping anything the learner
 * has already proven (so "Find" never suggests what you already mastered) and
 * anything that is a near-duplicate of the goal itself. Deterministic ordering.
 */
export function rankDiscoveries(searchResults, masteredTopics, options = {}) {
  const limit = clampDiscoverLimit(options.limit);
  const results = Array.isArray(searchResults) ? searchResults : [];

  // Build a set of tokens the learner has already mastered so we can filter
  // out lessons that merely restate proven ground.
  const masteredTokenSet = new Set();
  const masteredTitleSet = new Set();
  const masteredTokenLists = [];
  for (const t of Array.isArray(masteredTopics) ? masteredTopics : []) {
    masteredTitleSet.add(String(t.topic ?? "").trim().toLowerCase());
    const toks = frontierTokens(t.topic ?? "");
    if (toks.length) masteredTokenLists.push(toks);
    for (const tok of toks) masteredTokenSet.add(tok);
  }

  const seenTitles = new Set();
  const cards = [];
  for (const r of results) {
    if (!r || typeof r !== "object") continue;
    const title = String(r.title ?? "").trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seenTitles.has(key)) continue;
    if (masteredTitleSet.has(key)) continue; // already mastered — skip
    seenTitles.add(key);

    const titleTokens = frontierTokens(title);
    const titleTokenSet = new Set(titleTokens);
    // Skip a result whose every meaningful token is already mastered — it adds
    // nothing new to the learner's frontier.
    const fresh = titleTokens.filter((tok) => !masteredTokenSet.has(tok));
    const isFullyKnown = titleTokens.length > 0 && fresh.length === 0;
    // Skip a result that merely elaborates an already-mastered topic — i.e.
    // some proven topic's entire concept ("gravity") is contained in the
    // result title ("gravity basics", "advanced gravity"). "Find" should push
    // the learner PAST proven ground, not restate it.
    const elaboratesMastered = masteredTokenLists.some((toks) =>
      toks.every((tok) => titleTokenSet.has(tok))
    );
    if (isFullyKnown || elaboratesMastered) continue;

    cards.push({
      id: typeof r.id === "string" ? r.id : undefined,
      title,
      summary: String(r.summary ?? "").slice(0, 240),
      subject: String(r.subject ?? "General"),
      keyTakeaways: Array.isArray(r.keyTakeaways) ? r.keyTakeaways.slice(0, 3) : [],
      // Preserve relevance order from the text index; ties broken by title for
      // determinism.
      score: Number.isFinite(r.score) ? r.score : 0,
    });
  }

  cards.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
  });

  return cards.slice(0, limit);
}

/**
 * Assemble the final /api/find response body from a (possibly empty) set of
 * search results. Never throws — a missing DB simply yields an empty discover
 * list, so the client's on-device frontier remains the source of truth.
 */
export function buildFindResponse({ goal, masteredTopics, searchResults, limit }) {
  const topics = sanitizeMasteryTopics(masteredTopics);
  const cleanGoal = typeof goal === "string" ? goal.trim().slice(0, 160) : "";
  const discover = rankDiscoveries(searchResults, topics, { limit });
  return {
    goal: cleanGoal,
    provenTopics: topics.length,
    discover,
    // Signals the client can use to explain the result to the learner.
    newTerritory: discover.length === 0,
  };
}
