import type { LessonMode } from "@/types";

// Single source of truth for the answer-mode selector, shared by the
// homepage QuestionInput and the Settings page.
//
// BUG FIX (2026-08-15): both copies of this list had the LABELS swapped —
// the button labeled "Explain" selected `fast` (the quick 1-part answer)
// and the button labeled "Fast" selected `explain` (the deep 3-part
// journey), contradicting their own hints and the documented product
// model (Fast = one direct answer, Explain = Foundation → Mechanism →
// Real World). Keeping the list in one module means the labels can never
// drift apart again.
export const LESSON_MODES: { value: LessonMode; label: string; hint: string }[] = [
  { value: "fast", label: "Fast", hint: "Quick, simple explanation in 1 part" },
  { value: "explain", label: "Explain", hint: "Deep, detailed explanation in 3 parts" },
];
