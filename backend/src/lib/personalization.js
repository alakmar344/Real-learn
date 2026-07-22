// Shared personalization validation used by the generate-lesson endpoint.
// The actual data lives only on the user's device; the backend only sees it
// for the current request, uses it to tailor the prompt, and never stores it.

export const MAX_PERSONALIZATION_NOTES_CHARS = 500;

export const PERSONALIZATION_CHECKLIST_OPTIONS = [
  "Use simple language and short sentences",
  "Define key terms before using them",
  "Include real-world examples",
  "Explain step-by-step",
  "Use visual analogies",
  "Add more practice questions",
  "Break complex ideas into small chunks",
  "I prefer concise, direct answers",
  "I get overwhelmed by long blocks of text",
  "Show me how ideas connect to what I already know",
];

export function isValidChecklistValue(value) {
  return PERSONALIZATION_CHECKLIST_OPTIONS.includes(value);
}

export function sanitizeNotes(raw) {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed.slice(0, MAX_PERSONALIZATION_NOTES_CHARS);
}

export function sanitizeChecklist(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => typeof item === "string" && isValidChecklistValue(item));
}

export function sanitizePersonalization(raw) {
  const candidate = raw && typeof raw === "object" ? raw : {};
  return {
    checklist: sanitizeChecklist(candidate.checklist),
    notes: sanitizeNotes(candidate.notes),
    onboarded: candidate.onboarded === true,
  };
}

export function formatPersonalizationForPrompt(personalization) {
  if (!personalization?.onboarded) return null;
  const lines = [];
  if (personalization.checklist.length > 0) {
    lines.push("Learning-style preferences:");
    for (const item of personalization.checklist) {
      lines.push(`- ${item}`);
    }
  }
  if (personalization.notes?.trim()) {
    lines.push("Additional learner context:");
    lines.push(personalization.notes.trim());
  }
  return lines.length > 0 ? lines.join("\n") : null;
}
