import type { LessonMode } from "@/types";

// Single source of truth for the answer-mode selector, shared by the
// homepage QuestionInput and the Settings page.
//
// BUG FIX (2026-08-15): both copies of this list had the LABELS swapped —
// the button labeled "Explain" selected `fast` (the quick 1-part answer)
// and the button labeled "Fast" selected `explain` (the deep 3-part
// lesson), contradicting their own hints and the documented product
// model (fast = one direct answer, explain = 3-part lesson). Keeping the
// list in one module means the labels can never drift apart again.
//
// PLAIN-LANGUAGE labels (2026-08 rebuild): "Fast" vs "Explain" made people
// guess. Everyone understands "Quick answer" vs "Full lesson".
export const LESSON_MODES: { value: LessonMode; label: string; hint: string }[] = [
  { value: "fast", label: "Quick answer", hint: "One short, clear answer" },
  { value: "explain", label: "Full lesson", hint: "A full explanation in 3 short parts" },
];
