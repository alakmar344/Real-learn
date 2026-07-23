import { classifyTextFor13Plus } from "./safetyClassifier.js";

// Fast synchronous input/output guard used by server.js. The actual 13+
// suitability decision lives in safetyClassifier.js so the app does not carry
// two drifting moderation implementations.

export function filterUserInput(question) {
  if (!question || typeof question !== "string") return { allowed: true, filtered: question };
  const trimmed = question.trim();
  if (!classifyTextFor13Plus(trimmed, "input").allowed) {
    return {
      allowed: false,
      reason: "Your question appears to contain content that violates our community guidelines. Please rephrase your request.",
      filtered: null,
    };
  }
  return { allowed: true, filtered: trimmed };
}

export function filterAIResponse(rawResponse) {
  if (!rawResponse || typeof rawResponse !== "string") return { allowed: true, filtered: rawResponse };
  if (!classifyTextFor13Plus(rawResponse, "output").allowed) {
    return {
      allowed: false,
      reason: "The generated content was flagged for review. Please try a different question or rephrase your request.",
      filtered: null,
    };
  }
  return { allowed: true, filtered: rawResponse };
}
