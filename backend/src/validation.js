const REQUIRED_QUIZ_OPTIONS_COUNT = 4;
const MAX_SOURCES_PER_PART = 5;
const MAX_SOURCE_URL_LENGTH = 500;

// Hoisted to module scope: this 70-word set is a pure constant. Rebuilding it
// from a literal on every quiz question (via alignQuizCorrectIndex, which runs
// for each question during normalizeJourney AND on the quality-gate
// re-validation path) was needless per-question allocation.
const QUIZ_STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "to", "from", "in", "out",
  "on", "off", "over", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "any", "both", "each",
  "few", "more", "most", "other", "some", "such", "no", "nor", "not",
  "only", "own", "same", "so", "than", "too", "very", "can", "will",
  "just", "should", "now", "it", "its", "this", "that", "these", "those",
  "and", "but", "or", "if", "because", "as", "until", "while", "of", "at",
  "by", "for", "with", "about", "against", "between", "into", "through",
]);

// SECURITY: the model's `sources` array is attacker-influenceable output that
// is cached and served to EVERY future user asking the same question. Only
// well-formed http(s) URLs may pass — a `javascript:`/`data:` scheme (or any
// non-string junk) would otherwise become a stored-XSS payload the moment any
// client renders it as a link href.
export function sanitizeSources(sources) {
  if (!Array.isArray(sources)) return [];
  const clean = [];
  for (const source of sources) {
    if (typeof source !== "string") continue;
    const trimmed = source.trim();
    if (!trimmed || trimmed.length > MAX_SOURCE_URL_LENGTH) continue;
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      clean.push(url.href);
    } catch {
      continue; // not a parseable absolute URL — drop it
    }
    if (clean.length >= MAX_SOURCES_PER_PART) break;
  }
  return clean;
}

// Per-mode structural expectations.
// - "explain": the classic 3-part learning journey.
// - "fast": one direct answer part, two quick takeaways.
const MODE_RULES = {
  explain: { partsCount: 3, keyTakeawaysCount: 3 },
  fast: { partsCount: 1, keyTakeawaysCount: 2 },
};

export function getModeRules(mode) {
  return MODE_RULES[mode] ?? MODE_RULES.explain;
}

/**
 * Ensures a quiz question's `correctIndex` is 0-indexed and points to the
 * option that best matches `correctAnswer` or the explanation text.
 */
export function alignQuizCorrectIndex(q) {
  if (!q || typeof q !== "object" || !Array.isArray(q.options) || q.options.length === 0) {
    return q;
  }

  const options = q.options;
  let correctIndex = -1;

  // 1. Direct text/letter match from model's `correctAnswer` string
  if (typeof q.correctAnswer === "string" && q.correctAnswer.trim()) {
    const targetText = q.correctAnswer.trim().toLowerCase();
    const exactIdx = options.findIndex((opt) => typeof opt === "string" && opt.trim().toLowerCase() === targetText);
    if (exactIdx !== -1) {
      correctIndex = exactIdx;
    } else {
      const subIdx = options.findIndex((opt) => typeof opt === "string" && (opt.toLowerCase().includes(targetText) || targetText.includes(opt.toLowerCase())));
      if (subIdx !== -1) {
        correctIndex = subIdx;
      }
    }
    if (correctIndex === -1 && /^[a-d1-4]$/i.test(targetText)) {
      const char = targetText.toUpperCase();
      if (char >= "A" && char <= "D") correctIndex = char.charCodeAt(0) - 65;
      else if (char >= "1" && char <= "4") correctIndex = parseInt(char, 10) - 1;
    }
  }

  // 2. Letter/number string match from `correctIndex` (e.g. "A", "B", "C", "D" or "1", "2", "3", "4")
  if (correctIndex === -1 && typeof q.correctIndex === "string") {
    const strIdx = q.correctIndex.trim().toUpperCase();
    if (strIdx >= "A" && strIdx <= "D") correctIndex = strIdx.charCodeAt(0) - 65;
    else if (/^[1-4]$/.test(strIdx)) correctIndex = parseInt(strIdx, 10) - 1;
  }

  // 3. Integer index (fallback)
  if (correctIndex === -1 && Number.isInteger(q.correctIndex)) {
    correctIndex = q.correctIndex;
    if (correctIndex >= options.length && correctIndex === options.length) {
      correctIndex = options.length - 1;
    }
  }

  // 4. Token overlap fallback matching against `explanation`
  const explanation = typeof q.explanation === "string" ? q.explanation.toLowerCase() : "";

  if (explanation && (correctIndex < 0 || correctIndex >= options.length || (typeof q.correctAnswer !== "string" && correctIndex > 0))) {
    const getSignificantTokens = (text) => {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !QUIZ_STOP_WORDS.has(w));
    };

    // Set for O(1) membership — the inner loop below tested `expTokens.includes`
    // (linear scan) for every option token, making the match O(options × optTokens × expTokens).
    const expTokens = new Set(getSignificantTokens(explanation));

    const scores = options.map((opt) => {
      if (typeof opt !== "string") return 0;
      const cleanOpt = opt.toLowerCase().trim();
      if (!cleanOpt) return 0;

      if (explanation.includes(cleanOpt) || cleanOpt.includes(explanation)) {
        return 100;
      }

      const optTokens = getSignificantTokens(cleanOpt);
      if (optTokens.length === 0) return 0;

      let tokenMatches = 0;
      for (const t of optTokens) {
        if (expTokens.has(t) || explanation.includes(t)) {
          tokenMatches += 1;
        }
      }

      let phraseScore = 0;
      if (cleanOpt.length >= 8 && explanation.includes(cleanOpt.slice(0, Math.min(20, cleanOpt.length)))) {
        phraseScore = 50;
      }

      return (tokenMatches / optTokens.length) * 10 + phraseScore;
    });

    const bestScore = Math.max(...scores);
    const bestIndex = scores.indexOf(bestScore);

    if (correctIndex < 0 || correctIndex >= options.length) {
      correctIndex = bestScore > 0 ? bestIndex : 0;
    } else if (
      correctIndex >= 1 &&
      correctIndex <= options.length &&
      scores[correctIndex - 1] > scores[correctIndex] &&
      scores[correctIndex - 1] > 0
    ) {
      correctIndex = correctIndex - 1;
    } else if (bestScore > 0 && scores[correctIndex] === 0 && bestIndex !== correctIndex) {
      correctIndex = bestIndex;
    }
  }

  if (correctIndex < 0) correctIndex = 0;
  if (correctIndex >= options.length) correctIndex = options.length - 1;

  return {
    ...q,
    correctIndex,
  };
}

// A quiz question is usable only when fully formed. Truncated output can
// leave a trailing half-question; we salvage the complete ones instead of
// rejecting the whole lesson.
function isValidQuizQuestion(q) {
  return (
    q &&
    typeof q === "object" &&
    typeof q.question === "string" &&
    q.question.trim().length > 0 &&
    Array.isArray(q.options) &&
    q.options.length === REQUIRED_QUIZ_OPTIONS_COUNT &&
    q.options.every((opt) => typeof opt === "string") &&
    Number.isInteger(q.correctIndex) &&
    q.correctIndex >= 0 &&
    q.correctIndex < q.options.length &&
    typeof q.explanation === "string"
  );
}

function sortByPartNumber(a, b) {
  const aHasPartNumber = Number.isInteger(a?.partNumber) && a.partNumber > 0;
  const bHasPartNumber = Number.isInteger(b?.partNumber) && b.partNumber > 0;
  if (aHasPartNumber && bHasPartNumber) {
    return a.partNumber - b.partNumber;
  }
  if (aHasPartNumber) return -1;
  if (bHasPartNumber) return 1;
  return 0;
}

export function normalizeJourney(data, mode = "explain") {
  if (!data || typeof data !== "object") return data;
  const rules = getModeRules(mode);

  const normalized = { ...data, mode };
  if (!normalized.question && normalized.topic) {
    normalized.question = normalized.topic;
  }

  if (Array.isArray(data.parts)) {
    const normalizedParts = data.parts
      .filter((part) => part && typeof part === "object")
      // Salvage: keep only complete quiz questions (truncated output can leave
      // a half-written trailing question that would otherwise invalidate the
      // whole lesson — fatal in fast mode where there is only one part).
      .map((part) => ({
        ...part,
        quiz: Array.isArray(part.quiz)
          ? part.quiz
              // Align BEFORE validating: alignQuizCorrectIndex repairs the
              // string/letter ("A"/"3") and out-of-range correctIndex forms the
              // model sometimes emits. Filtering first discarded those salvageable
              // questions — and in fast mode, dropping the only question
              // invalidated the whole lesson and forced a repair round-trip.
              .map(alignQuizCorrectIndex)
              .filter(isValidQuizQuestion)
              .slice(0, 2)
          : [],
      }))
      // A part is only usable with a title, content, and at least one
      // complete quiz question.
      .filter(
        (part) =>
          typeof part.title === "string" &&
          typeof part.content === "string" &&
          part.content.trim().length > 0 &&
          part.quiz.length >= 1
      )
      .sort(sortByPartNumber)
      .slice(0, rules.partsCount)
      .map((part, index) => ({
        ...part,
        partNumber: index + 1,
        // Security: only clean, absolute http(s) URLs survive normalization —
        // see sanitizeSources above.
        sources: sanitizeSources(part.sources),
      }));
    normalized.parts = normalizedParts;
  }

  if (!Array.isArray(data.keyTakeaways) || data.keyTakeaways.length === 0) {
    const partsForTakeaways = Array.isArray(normalized.parts) ? normalized.parts : [];
    normalized.keyTakeaways = Array(rules.keyTakeawaysCount)
      .fill("")
      .map((_, i) =>
        partsForTakeaways[i]?.title
          ? `Key insight: ${partsForTakeaways[i].title}`
          : `Key insight ${i + 1}`
      );
  } else {
    normalized.keyTakeaways = data.keyTakeaways
      .filter((t) => typeof t === "string" && t.trim().length > 0)
      .slice(0, rules.keyTakeawaysCount);
  }

  return normalized;
}

export function isValidJourney(data, mode = "explain") {
  if (!data || typeof data !== "object") return false;
  const rules = getModeRules(mode);
  if (!Array.isArray(data.parts) || data.parts.length < 1) return false;
  if (data.parts.length > rules.partsCount) return false;

  return data.parts.every(
    (part, index) =>
      part?.partNumber === index + 1 &&
      typeof part.title === "string" &&
      typeof part.content === "string" &&
      Array.isArray(part.sources) &&
      Array.isArray(part.quiz) &&
      // Accept 1-2 complete quiz questions. Requiring exactly 2 made any
      // truncation fatal — especially in fast mode, whose single part has no
      // slack (explain mode could drop a trailing part and still validate).
      part.quiz.length >= 1 &&
      part.quiz.length <= 2 &&
      part.quiz.every(isValidQuizQuestion)
  );
}

export function hasExpectedPartCount(data, mode = "explain") {
  if (!data || typeof data !== "object" || !Array.isArray(data.parts)) return false;
  const rules = getModeRules(mode);
  return data.parts.length === rules.partsCount;
}
