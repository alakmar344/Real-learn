// Algorithmic quality gate — evaluates and auto-fixes lesson content before
// it reaches the student. Zero AI calls, pure text analysis.
//
// Responsibilities:
// 1. Readability scoring (Flesch-Kincaid grade level)
// 2. Vocabulary complexity analysis (multi-syllable words, jargon density)
// 3. Quiz difficulty evaluation (question length, option complexity, distractor difficulty)
// 4. Level-appropriate difficulty matching
// 5. Automatic language simplification when content is too advanced

// ── Syllable counting ──────────────────────────────────────────────────────

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

function countSyllables(word) {
  if (!word || typeof word !== "string") return 0;
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return 1;
  if (w.length <= 3) return w.split("").some((c) => VOWELS.has(c)) ? 1 : 0;

  let count = 0;
  let prevVowel = false;
  for (let i = 0; i < w.length; i++) {
    const isVowel = VOWELS.has(w[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  // Silent-e adjustment
  if (w.endsWith("e") && !w.endsWith("le") && count > 1) count--;
  // Ensure at least 1
  return Math.max(1, count);
}

// ── Text metrics ───────────────────────────────────────────────────────────

function getWords(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .replace(/[#*_`\[\](){}<>|~\-]/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\w\s'-]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function getSentenceCount(text) {
  if (!text || typeof text !== "string") return 1;
  const cleaned = text.replace(/[#*_`\[\](){}<>]/g, "");
  const matches = cleaned.match(/[.!?]+|\n+/g);
  return Math.max(1, matches ? matches.length : 1);
}

/**
 * Flesch-Kincaid Grade Level.
 * Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 * Returns a grade level (e.g., 6.0 = 6th grade, 10.0 = 10th grade).
 */
function fleschKincaidGrade(text) {
  const words = getWords(text);
  if (words.length === 0) return 0;
  const sentences = getSentenceCount(text);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const grade =
    0.39 * (words.length / sentences) + 11.8 * (totalSyllables / words.length) - 15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

/**
 * Average words per sentence — simpler readability proxy.
 */
function avgWordsPerSentence(text) {
  const words = getWords(text);
  const sentences = getSentenceCount(text);
  return Math.round((words.length / sentences) * 10) / 10;
}

/**
 * Percentage of words with 3+ syllables — "hard word" density.
 */
function hardWordPercentage(text) {
  const words = getWords(text);
  if (words.length === 0) return 0;
  const hard = words.filter((w) => countSyllables(w) >= 3).length;
  return Math.round((hard / words.length) * 1000) / 10;
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
  },
  "Class 9-10": {
    maxGrade: 11.0,
    maxAvgSentenceLen: 22,
    maxHardWordPct: 18,
    maxQuizGrade: 10.5,
    maxQuizOptionWords: 12,
  },
  "College / Advanced": {
    maxGrade: 16.0,
    maxAvgSentenceLen: 35,
    maxHardWordPct: 30,
    maxQuizGrade: 16.0,
    maxQuizOptionWords: 20,
  },
};

function getThresholds(level) {
  return LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS["Class 9-10"];
}

// ── Vocabulary complexity analysis ─────────────────────────────────────────

// Words that are too advanced for Class 6-8 — mapped to simpler alternatives.
const SIMPLIFICATION_MAP = new Map([
  // Science / academic
  ["photosynthesis", "how plants make food from sunlight"],
  ["mitochondria", "tiny parts of cells that make energy"],
  ["chromosome", "a thread-like part of a cell that carries genes"],
  ["hypothesis", "a guess you can test"],
  ["experiment", "a test to find out something"],
  ["molecule", "a tiny particle of matter"],
  ["atom", "the smallest piece of an element"],
  ["ecosystem", "a community of living things and their environment"],
  ["biodiversity", "the variety of living things in an area"],
  ["evolution", "how living things change over a long time"],
  ["gravity", "the force that pulls things toward Earth"],
  ["friction", "the force that slows things down when they rub together"],
  ["velocity", "speed in a certain direction"],
  ["acceleration", "how fast something speeds up"],
  ["equation", "a math statement with an equals sign"],
  ["variable", "a letter that stands for a number we don't know yet"],
  ["coefficient", "a number that multiplies a variable"],
  ["denominator", "the bottom number in a fraction"],
  ["numerator", "the top number in a fraction"],
  ["perpendicular", "at a right angle to something"],
  ["circumference", "the distance around a circle"],
  ["diameter", "the distance across a circle through the center"],
  ["radius", "the distance from the center of a circle to its edge"],
  ["geography", "the study of the Earth's surface"],
  ["civilization", "a society with its own culture and government"],
  ["democracy", "a system where people vote to choose leaders"],
  ["monarchy", "a system where a king or queen rules"],
  ["economy", "how a country makes and uses money and goods"],
  ["inflation", "when prices go up over time"],
  ["recession", "when the economy slows down"],
  ["parliament", "a group that makes laws for a country"],
  ["constitution", "the set of rules a country is governed by"],
  ["amendment", "a change or addition to a law or rule"],
  ["legislation", "laws made by a government"],
  ["photosynthetic", "related to how plants make food"],
  ["thermodynamics", "the study of heat and energy"],
  ["electromagnetic", "related to electric and magnetic forces"],
  ["metamorphosis", "a big change in form, like a caterpillar becoming a butterfly"],
  ["predator", "an animal that hunts other animals"],
  ["prey", "an animal that is hunted by other animals"],
  ["decomposition", "breaking down into smaller parts"],
  ["sediment", "tiny bits of rock and dirt that settle at the bottom"],
  ["erosion", "when wind or water slowly wears away rock or soil"],
  ["tectonic", "related to the large plates that make up Earth's surface"],
  ["convection", "heat moving through liquids or gases"],
  ["conduction", "heat moving through a solid material"],
  ["radiation", "energy that travels in waves"],
  ["frequency", "how often something happens in a given time"],
  ["amplitude", "the height of a wave"],
  ["wavelength", "the distance between two wave peaks"],
  ["catalyst", "something that speeds up a chemical reaction"],
  ["oxidation", "when a substance reacts with oxygen"],
  ["combustion", "burning"],
  ["synthesis", "building something from parts"],
  ["analytical", "carefully examining things"],
  ["comprehensive", "covering everything"],
  ["significant", "important or meaningful"],
  ["fundamental", "basic and very important"],
  ["phenomenon", "something that happens or can be seen"],
  ["hypothesize", "make a guess you can test"],
  ["correlation", "a connection between two things"],
  ["implication", "a result or effect of something"],
  ["methodology", "the way something is done"],
  ["paradigm", "a way of thinking about something"],
  ["infrastructure", "basic systems like roads and power that a place needs"],
  ["bureaucracy", "a system with many rules and officials"],
  ["sovereignty", "the right of a country to govern itself"],
  ["colonialism", "when one country takes control of another"],
  ["industrialization", "when a country builds lots of factories and machines"],
  ["urbanization", "when more people move to cities"],
  ["globalization", "how the world's countries become more connected"],
]);

// Additional hard words that should be flagged even if not in the map above.
// Organized by syllable count for quick lookup.
const HARD_WORD_PATTERNS = [
  // 4+ syllable words that are often jargon
  /characterization/i,
  /institutional/i,
  /comprehensive/i,
  /infrastructure/i,
  /responsibility/i,
  /communication/i,
  /implementation/i,
  /environmental/i,
  /electromagnetic/i,
  /photosynthesis/i,
  /constitutional/i,
  /interpretation/i,
  /investigation/i,
  /demonstration/i,
  /representation/i,
  /transformation/i,
  /determination/i,
  /administration/i,
  /accomplishment/i,
  /sophisticated/i,
  /approximately/i,
  /simultaneously/i,
  /philosophical/i,
  /technological/i,
  /mathematical/i,
  /psychological/i,
  /bibliography/i,
  /microorganism/i,
  /thermodynamics/i,
];

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
 * Simplify a single sentence for Class 6-8 level.
 * - Replaces known complex words with simpler alternatives (English only)
 * - Shortens very long sentences by splitting at conjunctions
 */
function simplifyText(text, level, language = "English") {
  if (!text || typeof text !== "string") return text;
  if (level !== "Class 6-8") return text; // Only simplify for youngest learners

  let result = text;

  // Replace known complex words/phrases (English only)
  if (language === "English") {
    for (const [complex, simple] of SIMPLIFICATION_MAP) {
      // Case-insensitive whole-word replacement
      const pattern = new RegExp(`\\b${escapeRegex(complex)}\\b`, "gi");
      result = result.replace(pattern, (match) => {
        // Preserve original casing for the first letter
        if (match[0] === match[0].toUpperCase()) {
          return simple.charAt(0).toUpperCase() + simple.slice(1);
        }
        return simple;
      });
    }
  }

  // Split very long sentences (> 25 words) at conjunctions (works for any language)
  result = splitLongSentences(result, 25);

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
 * Simplify a quiz question for Class 6-8 level.
 * Returns the modified question object (or the original if no changes needed).
 */
function simplifyQuizQuestion(question, level, language = "English") {
  if (level !== "Class 6-8") return question;
  if (!question || typeof question !== "object") return question;

  const simplified = { ...question };

  // Simplify question text
  if (typeof simplified.question === "string") {
    simplified.question = simplifyText(simplified.question, level, language);
    // If still too long, truncate intelligently at a clause boundary
    const qWords = getWords(simplified.question);
    if (qWords.length > 20) {
      simplified.question = truncateAtClause(simplified.question, 20);
    }
  }

  // Simplify options — also enforce length limit
  if (Array.isArray(simplified.options)) {
    simplified.options = simplified.options.map((opt) => {
      if (typeof opt !== "string") return opt;
      let s = simplifyText(opt, level, language);
      const optWords = getWords(s);
      if (optWords.length > 8) {
        s = truncateAtClause(s, 8);
      }
      return s;
    });
  }

  // Simplify explanation
  if (typeof simplified.explanation === "string") {
    simplified.explanation = simplifyText(simplified.explanation, level, language);
  }

  return simplified;
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
    console.log("[qualityGate] Issues detected and auto-fixed", {
      level,
      issueCount: issues.length,
      fixCount: fixed.length,
      issues: issues.slice(0, 10),
    });
  }

  return { journey: resultJourney, report };
}
