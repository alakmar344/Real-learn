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

export function sanitizeNotes(raw: string): string {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed.slice(0, MAX_PERSONALIZATION_NOTES_CHARS);
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
