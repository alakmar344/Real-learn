// Algorithmic quality gate — evaluates and auto-fixes lesson content before
// it reaches the student. Zero AI calls, pure text analysis.
//
// Responsibilities:
// 1. Readability scoring (Flesch-Kincaid grade level)
// 2. Vocabulary complexity analysis (multi-syllable words, jargon density)
// 3. Quiz difficulty evaluation (question length, option complexity, distractor difficulty)
// 4. Level-appropriate difficulty matching
// 5. Automatic language simplification when content is too advanced

import readability from "text-readability";
import { syllable } from "syllable";

const syllableCache = new Map();
const MAX_SYLLABLE_CACHE = 4000;

function countSyllables(word) {
  if (!word || typeof word !== "string") return 0;
  const lower = word.toLowerCase();
  const cached = syllableCache.get(lower);
  if (cached !== undefined) return cached;
  const count = Math.max(1, syllable(lower) || 0);
  if (syllableCache.size >= MAX_SYLLABLE_CACHE) {
    const firstKey = syllableCache.keys().next().value;
    if (firstKey) syllableCache.delete(firstKey);
  }
  syllableCache.set(lower, count);
  return count;
}

const URL_CLEAN_RE = /https?:\/\/\S+/g;
const PUNCT_CLEAN_RE = /[#*_`\[\](){}<>|~\-]|[^\w\s'-]/g;

function getWords(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .replace(URL_CLEAN_RE, "")
    .replace(PUNCT_CLEAN_RE, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Flesch-Kincaid Grade Level.
 * Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 * Returns a grade level (e.g., 6.0 = 6th grade, 10.0 = 10th grade).
 */
function fleschKincaidGrade(text) {
  if (!text || typeof text !== "string" || !text.trim()) return 0;
  return Math.max(0, readability.fleschKincaidGrade(text));
}

/**
 * Average words per sentence — simpler readability proxy.
 */
function avgWordsPerSentence(text) {
  if (!text || typeof text !== "string" || !text.trim()) return 0;
  return readability.averageSentenceLength(text);
}

/**
 * Percentage of words with 3+ syllables — "hard word" density.
 */
function hardWordPercentage(text) {
  if (!text || typeof text !== "string" || !text.trim()) return 0;
  const words = readability.lexiconCount(text);
  if (words === 0) return 0;
  const hard = readability.polySyllableCount(text);
  return Math.round((hard / words) * 1000) / 10;
}

// ── Level thresholds ───────────────────────────────────────────────────────
// Maps each level to max acceptable grade, max avg sentence length, max hard-word %.

const LEVEL_THRESHOLDS = {
  "Class 6-8": {
    maxGrade: 8.0,
    maxAvgSentenceLen: 16,
    maxHardWordPct: 12,
    maxQuizGrade: 7.5,
    maxQuizOptionWords: 8,
    maxQuestionWords: 20,
  },
  "Class 9-10": {
    maxGrade: 11.0,
    maxAvgSentenceLen: 22,
    maxHardWordPct: 18,
    maxQuizGrade: 10.5,
    maxQuizOptionWords: 12,
    maxQuestionWords: 25,
  },
  "College / Advanced": {
    maxGrade: 16.0,
    maxAvgSentenceLen: 35,
    maxHardWordPct: 30,
    maxQuizGrade: 16.0,
    maxQuizOptionWords: 20,
    maxQuestionWords: 40,
  },
};

function getThresholds(level) {
  return LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS["Class 9-10"];
}

// ── Vocabulary complexity analysis ─────────────────────────────────────────

// Words that are too advanced for Class 6-8 — mapped to simpler alternatives.
const SIMPLIFICATION_MAP = new Map([
  // Obscure / overly bureaucratic jargon
  ["thermodynamics", "the science of heat and energy"],
  ["metamorphosis", "transformation (like a caterpillar becoming a butterfly)"],
  ["decomposition", "natural breaking down into simpler parts"],
  ["infrastructure", "essential systems like roads, power, and networks"],
  ["bureaucracy", "complex administrative systems and paperwork"],
  ["sovereignty", "supreme power and self-governance"],
  ["colonialism", "when one nation controls and exploits another"],
  ["industrialization", "transition to large-scale factory production"],
  ["urbanization", "the growth and expansion of cities"],
  ["globalization", "worldwide interconnectedness and trade"],
  ["methodology", "systematic way of doing something"],
  ["paradigm", "standard model or worldview"],
]);

// Precompiled whole-word replacement patterns for SIMPLIFICATION_MAP.
const SIMPLIFICATION_PATTERNS = Array.from(SIMPLIFICATION_MAP, ([complex, simple]) => ({
  pattern: new RegExp(`\\b${escapeRegex(complex)}\\b`, "gi"),
  simple,
}));

/**
 * Detect words that are too complex for a given level.
 * Returns an array of { word, suggestion } objects.
 */
function findComplexWords(text, level) {
  if (level !== "Class 6-8") return []; // Only aggressively simplify for young learners
  const words = getWords(text);
  const issues = [];
  const seen = new Set();

  for (const word of words) {
    if (seen.has(word)) continue;
    seen.add(word);

    // Check simplification map first
    const suggestion = SIMPLIFICATION_MAP.get(word);
    if (suggestion) {
      issues.push({ word, suggestion });
      continue;
    }

    // Check if 4+ syllable and not a common word
    if (countSyllables(word) >= 4 && !isCommonWord(word)) {
      issues.push({ word, suggestion: null });
    }
  }
  return issues;
}

// Common 4+ syllable words that are fine for Class 6-8
const COMMON_WORDS = new Set([
  "everything", "anything", "something", "nothing", "everyone", "someone",
  "anyone", "whatever", "whenever", "wherever", "however", "altogether",
  "understand", "imagination", "temperature", "different", "interested",
  "important", "necessary", "probably", "possibly", "certainly", "actually",
  "basically", "immediately", "especially", "experience", "information",
  "education", "community", "families", "animals", "energy", "history",
  "science", "electricity", "magnificent", "beautiful", "wonderful",
  "absolutely", "incredible", "unbelievable", "independent", "independently",
  "communicate", "communication", "determined", "determination",
]);

function isCommonWord(word) {
  return COMMON_WORDS.has(word.toLowerCase());
}

// ── Quiz difficulty analysis ───────────────────────────────────────────────

/**
 * Analyze a single quiz question for difficulty.
 * Returns { grade, issues: string[] }
 */
function analyzeQuizQuestion(question, level) {
  const thresholds = getThresholds(level);
  const issues = [];

  if (!question || typeof question !== "object") {
    return { grade: 0, issues: ["Invalid quiz question"] };
  }

  // Question text readability
  const qGrade = fleschKincaidGrade(question.question || "");
  if (qGrade > thresholds.maxQuizGrade) {
    issues.push(
      `Question too complex (grade ${qGrade} > max ${thresholds.maxQuizGrade})`
    );
  }

  // Question length — very long questions are harder to parse
  const qWords = getWords(question.question || "");
  if (level === "Class 6-8" && qWords.length > 20) {
    issues.push(`Question too long (${qWords.length} words, max 20 for Class 6-8)`);
  }

  // Option complexity
  if (Array.isArray(question.options)) {
    for (let i = 0; i < question.options.length; i++) {
      const opt = question.options[i];
      if (typeof opt !== "string") continue;
      const optWords = getWords(opt);
      if (optWords.length > thresholds.maxQuizOptionWords) {
        issues.push(
          `Option ${i + 1} too long (${optWords.length} words, max ${thresholds.maxQuizOptionWords})`
        );
      }
      // Check readability of long options
      if (optWords.length > 5) {
        const optGrade = fleschKincaidGrade(opt);
        if (optGrade > thresholds.maxQuizGrade + 2) {
          issues.push(
            `Option ${i + 1} too complex (grade ${optGrade})`
          );
        }
      }
    }

    // Check if all options are roughly the same length (poor distractor design)
    const lengths = question.options
      .filter((o) => typeof o === "string")
      .map((o) => getWords(o).length);
    if (lengths.length === 4) {
      const maxLen = Math.max(...lengths);
      const minLen = Math.min(...lengths);
      if (maxLen > minLen * 4 && maxLen > 10) {
        issues.push("Options have very uneven lengths (poor distractor design)");
      }
    }
  }

  // Explanation complexity
  if (typeof question.explanation === "string" && question.explanation.length > 0) {
    const expGrade = fleschKincaidGrade(question.explanation);
    if (expGrade > thresholds.maxQuizGrade + 1) {
      issues.push(
        `Explanation too complex (grade ${expGrade} > max ${thresholds.maxQuizGrade + 1})`
      );
    }
  }

  return { grade: qGrade, issues };
}

// ── Content analysis ───────────────────────────────────────────────────────

/**
 * Analyze a single part's content for level-appropriateness.
 * Returns { grade, avgSentenceLen, hardWordPct, issues: string[] }
 */
function analyzeContent(text, level, language = "English") {
  const thresholds = getThresholds(level);
  const issues = [];

  const grade = fleschKincaidGrade(text);
  const avgSentLen = avgWordsPerSentence(text);
  const hardPct = hardWordPercentage(text);

  if (grade > thresholds.maxGrade) {
    issues.push(`Content too complex (grade ${grade} > max ${thresholds.maxGrade})`);
  }
  if (avgSentLen > thresholds.maxAvgSentenceLen) {
    issues.push(
      `Sentences too long (avg ${avgSentLen} words > max ${thresholds.maxAvgSentenceLen})`
    );
  }
  if (hardPct > thresholds.maxHardWordPct) {
    issues.push(
      `Too many hard words (${hardPct}% > max ${thresholds.maxHardWordPct}%)`
    );
  }

  // Check for specific complex words at Class 6-8 level (English only)
  if (level === "Class 6-8" && language === "English") {
    const complexWords = findComplexWords(text, level);
    if (complexWords.length > 0) {
      const words = complexWords.slice(0, 5).map((c) => c.word).join(", ");
      issues.push(`Complex words detected: ${words}${complexWords.length > 5 ? "..." : ""}`);
    }
  }

  return { grade, avgSentenceLen: avgSentLen, hardWordPct: hardPct, issues };
}

// ── Language simplification engine ─────────────────────────────────────────

/**
 * Simplify a single sentence for the target level.
 * - Replaces known complex words with simpler alternatives (English only,
 *   skipped for College / Advanced where the original vocabulary is wanted)
 * - Shortens very long sentences by splitting at conjunctions
 */
function simplifyText(text, level, language = "English") {
  if (!text || typeof text !== "string") return text;
  // College / Advanced content is supposed to be sophisticated; do not
  // rewrite its vocabulary.
  if (level === "College / Advanced") return text;

  let result = text;

  // Replace known complex words/phrases (English only)
  if (language === "English") {
    for (const { pattern, simple } of SIMPLIFICATION_PATTERNS) {
      // Case-insensitive whole-word replacement
      result = result.replace(pattern, (match) => {
        // Preserve original casing for the first letter
        if (match[0] === match[0].toUpperCase()) {
          return simple.charAt(0).toUpperCase() + simple.slice(1);
        }
        return simple;
      });
    }
  }

  // Split long sentences at natural break points to reduce grade level
  const thresholds = getThresholds(level);
  result = splitLongSentences(result, thresholds.maxAvgSentenceLen);

  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split sentences that are too long at natural break points (and, but, so, because).
 */
function splitLongSentences(text, maxWords) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const result = [];

  for (const sentence of sentences) {
    const words = getWords(sentence);
    if (words.length <= maxWords) {
      result.push(sentence);
      continue;
    }

    // Try to split at conjunctions
    const splitPoints = [" and ", " but ", " so ", " because ", " which ", " that "];
    let split = false;
    for (const conj of splitPoints) {
      const idx = sentence.indexOf(conj);
      if (idx > 20 && idx < sentence.length - 20) {
        const part1 = sentence.slice(0, idx).trim();
        const part2 = sentence.slice(idx + conj.length).trim();
        if (part1.length > 10 && part2.length > 10) {
          // Capitalize first letter of second part
          const capitalizedPart2 =
            part2.charAt(0).toUpperCase() + part2.slice(1);
          result.push(part1 + ".");
          result.push(capitalizedPart2);
          split = true;
          break;
        }
      }
    }

    if (!split) {
      result.push(sentence);
    }
  }

  return result.join(" ");
}

/**
 * Simplify a quiz question for the target level.
 * Returns the modified question object (or the original if no changes needed).
 */
function simplifyQuizQuestion(question, level, language = "English") {
  if (level === "College / Advanced") return question;
  if (!question || typeof question !== "object") return question;

  const thresholds = getThresholds(level);
  const simplified = { ...question };

  // Simplify question text
  if (typeof simplified.question === "string") {
    simplified.question = simplifyText(simplified.question, level, language);
    // If still too long, truncate intelligently at a clause boundary
    const qWords = getWords(simplified.question);
    if (qWords.length > thresholds.maxQuestionWords) {
      simplified.question = truncateAtClause(
        simplified.question,
        thresholds.maxQuestionWords
      );
    }
  }

  // Simplify options — enforce length limit AND reduce complexity for the level
  if (Array.isArray(simplified.options)) {
    simplified.options = simplified.options.map((opt) => {
      if (typeof opt !== "string") return opt;
      let s = simplifyText(opt, level, language);
      const optWords = getWords(s);
      if (optWords.length > thresholds.maxQuizOptionWords) {
        s = truncateAtClause(s, thresholds.maxQuizOptionWords);
      }
      // If the option is still too complex (high FK grade), strip
      // subordinate clauses and parentheticals to lower the grade
      if (optWords.length > 5) {
        const optGrade = fleschKincaidGrade(s);
        if (optGrade > thresholds.maxQuizGrade + 2) {
          s = stripSubordinateClauses(s, thresholds.maxQuizOptionWords);
        }
      }
      return s;
    });

    // Balance uneven option lengths — when one option is 4x+ longer than the
    // shortest (and > 10 words), truncate outliers toward the median length
    const lengths = simplified.options
      .filter((o) => typeof o === "string")
      .map((o) => getWords(o).length);
    if (lengths.length === 4) {
      const sorted = [...lengths].sort((a, b) => a - b);
      const median = Math.ceil((sorted[1] + sorted[2]) / 2);
      const maxLen = Math.max(...lengths);
      const minLen = Math.min(...lengths);
      if (maxLen > minLen * 4 && maxLen > 10) {
        const target = Math.max(median, thresholds.maxQuizOptionWords);
        simplified.options = simplified.options.map((opt) => {
          if (typeof opt !== "string") return opt;
          const wc = getWords(opt).length;
          if (wc > target) {
            return truncateAtClause(opt, target);
          }
          return opt;
        });
      }
    }
  }

  // Simplify explanation — vocabulary replacement + sentence splitting
  if (typeof simplified.explanation === "string") {
    simplified.explanation = simplifyText(simplified.explanation, level, language);
    // If explanation is still too complex, split its long sentences further
    const expGrade = fleschKincaidGrade(simplified.explanation);
    if (expGrade > thresholds.maxQuizGrade + 1) {
      simplified.explanation = splitLongSentences(
        simplified.explanation,
        Math.max(12, thresholds.maxAvgSentenceLen - 4)
      );
    }
  }

  return simplified;
}

/**
 * Strip subordinate clauses and parentheticals from text to reduce
 * Flesch-Kincaid grade. Removes content in parentheses, and clauses
 * starting with which/that/who/where/although when they make the text
 * exceed the word limit.
 */
function stripSubordinateClauses(text, maxWords) {
  if (!text || typeof text !== "string") return text;

  let result = text;

  // Remove parenthetical content: "(some detail here)"
  result = result.replace(/\s*\([^)]{5,}\)/g, "");

  // Remove trailing subordinate clauses: ", which ...", ", that ...", etc.
  result = result.replace(
    /,\s*(?:which|that|who|where|although|even though)\b[^,.]*/gi,
    ""
  );

  // If still over limit, hard-truncate
  const words = result.split(/\s+/);
  if (words.length > maxWords) {
    result = truncateAtClause(result, maxWords);
  }

  return result.trim();
}

/**
 * Truncate text to approximately maxWords, breaking at a natural point.
 */
function truncateAtClause(text, maxWords) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  // Try to find a clause break before maxWords
  const breakChars = [",", ";", " —", " -", " which", " that", " and", " but"];
  for (let i = maxWords; i >= Math.max(5, maxWords - 5); i--) {
    const partial = words.slice(0, i).join(" ");
    for (const brk of breakChars) {
      if (partial.includes(brk)) {
        const idx = partial.lastIndexOf(brk);
        if (idx > 10) {
          return partial.slice(0, idx).trim();
        }
      }
    }
  }

  // Hard cutoff
  return words.slice(0, maxWords).join(" ");
}

// ── Main quality gate ──────────────────────────────────────────────────────

/**
 * Evaluate a journey for level-appropriate quality and auto-fix issues.
 *
 * @param {object} journey - The normalized journey object
 * @param {string} level - "Class 6-8" | "Class 9-10" | "College / Advanced"
 * @param {string} mode - "explain" | "fast"
 * @param {string} language - "English" | "Hindi" | etc.
 * @returns {{ journey: object, report: object }}
 *   journey: the (possibly fixed) journey
 *   report: { passed: boolean, issues: string[], fixed: string[], metrics: object }
 */
export function evaluateAndFix(journey, level = "Class 9-10", mode = "explain", language = "English") {
  if (!journey || typeof journey !== "object") {
    return {
      journey,
      report: { passed: true, issues: [], fixed: [], metrics: {} },
    };
  }

  const issues = [];
  const fixed = [];
  let needsFix = false;
  const metrics = { parts: [] };

  // ── Analyze each part ──
  const parts = Array.isArray(journey.parts) ? journey.parts : [];
  const analyzedParts = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || typeof part !== "object") {
      analyzedParts.push(part);
      continue;
    }

    // Analyze content
    const contentAnalysis = analyzeContent(
      typeof part.content === "string" ? part.content : "",
      level,
      language
    );

    // Analyze quiz questions
    const quizResults = [];
    const quiz = Array.isArray(part.quiz) ? part.quiz : [];
    for (const q of quiz) {
      quizResults.push(analyzeQuizQuestion(q, level));
    }

    const partMetrics = {
      partNumber: part.partNumber ?? i + 1,
      content: contentAnalysis,
      quiz: quizResults,
    };
    metrics.parts.push(partMetrics);

    // Collect issues
    if (contentAnalysis.issues.length > 0) {
      issues.push(...contentAnalysis.issues.map((iss) => `Part ${i + 1}: ${iss}`));
    }
    for (let qi = 0; qi < quizResults.length; qi++) {
      if (quizResults[qi].issues.length > 0) {
        issues.push(
          ...quizResults[qi].issues.map(
            (iss) => `Part ${i + 1}, Quiz ${qi + 1}: ${iss}`
          )
        );
      }
    }

    // Auto-fix if needed
    if (contentAnalysis.issues.length > 0 || quizResults.some((r) => r.issues.length > 0)) {
      needsFix = true;
      const fixedPart = { ...part };

      // Fix content
      if (contentAnalysis.issues.length > 0 && typeof fixedPart.content === "string") {
        const originalContent = fixedPart.content;
        fixedPart.content = simplifyText(fixedPart.content, level, language);
        if (fixedPart.content !== originalContent) {
          fixed.push(`Part ${i + 1}: Simplified content vocabulary`);
        }
      }

      // Fix quiz questions
      if (Array.isArray(fixedPart.quiz)) {
        fixedPart.quiz = fixedPart.quiz.map((q, qi) => {
          if (quizResults[qi] && quizResults[qi].issues.length > 0) {
            const original = JSON.stringify(q);
            const simplified = simplifyQuizQuestion(q, level, language);
            if (JSON.stringify(simplified) !== original) {
              fixed.push(`Part ${i + 1}, Quiz ${qi + 1}: Simplified question/options`);
            }
            return simplified;
          }
          return q;
        });
      }

      analyzedParts.push(fixedPart);
    } else {
      analyzedParts.push(part);
    }
  }

  // Build result
  const resultJourney = needsFix ? { ...journey, parts: analyzedParts } : journey;

  const report = {
    passed: issues.length === 0,
    issues,
    fixed,
    metrics,
    level,
  };

  if (issues.length > 0) {
    const logLabel =
      fixed.length > 0
        ? "[qualityGate] Issues detected and auto-fixed"
        : "[qualityGate] Issues detected (auto-fix did not change content)";
    console.log(logLabel, {
      level,
      issueCount: issues.length,
      fixCount: fixed.length,
      issues: issues.slice(0, 10),
    });
  }

  return { journey: resultJourney, report };
}
