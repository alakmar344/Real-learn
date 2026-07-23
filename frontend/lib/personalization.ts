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

export interface LearningPreferences {
  /** Checklist tags the learner selected to describe how they learn best. */
  checklist: string[];
  /** Free-text notes the learner added about how they learn or any needs. */
  notes: string;
  /** Whether the learner has completed the personalization onboarding step. */
  onboarded: boolean;
}

export const DEFAULT_LEARNING_PREFERENCES: LearningPreferences = {
  checklist: [],
  notes: "",
  onboarded: false,
};

export function isValidChecklistValue(value: string): boolean {
  return PERSONALIZATION_CHECKLIST_OPTIONS.includes(value);
}

// SECURITY (parity with backend/src/lib/personalization.js): notes end up
// inside the LLM prompt, so strip control/zero-width characters (used to
// smuggle words past content filters), runs of angle brackets, and the
// prompt fence-marker keywords.
//
// BUG FIX: this used to `.trim()` — but it runs on EVERY keystroke of a
// controlled textarea, so a trailing space was stripped the moment it was
// typed and users could never type a space between words. Live sanitization
// must not trim; the backend trims once at submit time.
const INVISIBLE_CHARS_PATTERN =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\uFEFF]/g;
const FENCE_MARKER_PATTERN =
  /(?:END_)?(?:LEARNER_NOTES|STUDENT_QUESTION|EXTERNAL_CONTEXT)/gi;

export function sanitizeNotes(raw: string): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(INVISIBLE_CHARS_PATTERN, "")
    .replace(/<{2,}|>{2,}/g, "")
    .replace(FENCE_MARKER_PATTERN, "")
    .slice(0, MAX_PERSONALIZATION_NOTES_CHARS);
}

export function sanitizeChecklist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .filter(isValidChecklistValue);
}

export function sanitizeLearningPreferences(raw: unknown): LearningPreferences {
  const candidate = typeof raw === "object" && raw !== null ? (raw as Partial<LearningPreferences>) : {};
  return {
    checklist: sanitizeChecklist(candidate.checklist),
    notes: sanitizeNotes(candidate.notes ?? ""),
    onboarded: candidate.onboarded === true,
  };
}

export function formatPreferencesForPrompt(prefs: LearningPreferences): string | null {
  if (!prefs.onboarded && prefs.checklist.length === 0 && !prefs.notes) return null;
  const lines: string[] = [];
  if (prefs.checklist.length > 0) {
    lines.push("Learning-style preferences:");
    for (const item of prefs.checklist) {
      lines.push(`- ${item}`);
    }
  }
  if (prefs.notes.trim()) {
    lines.push("Additional learner context:");
    lines.push(prefs.notes.trim());
  }
  return lines.join("\n");
}
