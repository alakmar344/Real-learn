// Shared request parsing/normalization for the generate-lesson and
// lesson-cache-check endpoints. Keeping the two paths identical prevents
// cache-key mismatches between "is it cached?" and "generate it".
import { filterUserInput } from "./contentGuard.js";
import {
  sanitizePersonalization,
  sanitizeLearningContext,
  MAX_LEARNING_CONTEXT_CHARS,
} from "./personalization.js";
import { moderateText } from "./moderation.js";
import {
  MAX_QUESTION_LENGTH,
  ALLOWED_LANGUAGES,
  ALLOWED_LEVELS,
} from "../config.js";
import { cleanForLog } from "../middleware/security.js";

export function parseLessonBody(req) {
  const question =
    typeof req.body?.question === "string" ? req.body.question.trim() : "";
  const language = req.body?.language ?? "English";
  const level = req.body?.level ?? "Class 9-10";
  const mode = req.body?.mode === "fast" ? "fast" : "explain";
  const personalization = sanitizePersonalization(req.body?.personalization);

  // SECURITY: personalization notes/goals are free text that flows into the
  // LLM prompt, so they must clear the same banned-content filter as the
  // question. Blocked fields are dropped (the lesson still generates) and
  // the drop happens BEFORE the cache key is computed.
  if (personalization.notes) {
    const notesFilter = filterUserInput(personalization.notes);
    if (!notesFilter.allowed) {
      personalization.notes = "";
    }
  }
  if (personalization.goals) {
    const goalsFilter = filterUserInput(personalization.goals);
    if (!goalsFilter.allowed) {
      personalization.goals = "";
    }
  }

  // SECURITY (DoS): cap the raw context BEFORE running the content-filter
  // regexes. The question (≤1000) and notes (≤500) are already bounded;
  // learningContext previously reached filterUserInput at its full body size
  // (up to the 100kb JSON limit), so a huge payload of trigger words could
  // stall the event loop.
  let learningContextRaw =
    typeof req.body?.learningContext === "string"
      ? req.body.learningContext.slice(0, MAX_LEARNING_CONTEXT_CHARS)
      : "";
  if (learningContextRaw) {
    const contextFilter = filterUserInput(learningContextRaw);
    if (!contextFilter.allowed) {
      learningContextRaw = "";
    }
  }
  learningContextRaw = sanitizeLearningContext(learningContextRaw);

  return { question, language, level, mode, personalization, learningContextRaw };
}

export function validateLessonRequest({ question, language, level }) {
  if (!question) {
    return { ok: false, status: 400, error: "Question is required" };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `Question is too long (max ${MAX_QUESTION_LENGTH} characters).`,
    };
  }
  if (!ALLOWED_LANGUAGES.has(language)) {
    return { ok: false, status: 400, error: "Unsupported language." };
  }
  if (!ALLOWED_LEVELS.has(level)) {
    return { ok: false, status: 400, error: "Unsupported level." };
  }
  return { ok: true };
}

export async function moderateLessonInput(question) {
  const inputModeration = await moderateText(question, "input");
  if (!inputModeration.allowed) {
    return { ok: false, error: inputModeration.reason };
  }
  return { ok: true };
}

export function logLessonParseError(requestId, label, details) {
  console.warn(`[lesson-request] ${label}`, { requestId, ...details });
}

export { cleanForLog };
