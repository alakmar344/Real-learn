"use client";

import NightOwlHero, { type NightOwlMode } from "@/components/homepage/NightOwlHero";
import { useLesson } from "@/hooks/useLesson";
import { usePreferenceStore } from "@/store/preferenceStore";
import { type LessonMode } from "@/types";

// Standalone showcase route for the Night Owl (Swiss Industrial Brutalism)
// hero. The CTA is fully functional: it forwards the question + mode to the
// real lesson pipeline, then lands on /learn.
export default function NightOwlPage() {
  const { generateLesson } = useLesson();
  const setMode = usePreferenceStore((s) => s.setMode);

  const handleSubmit = async (question: string, mode: NightOwlMode) => {
    setMode((mode === "tldr" ? "fast" : "explain") as LessonMode);
    await generateLesson(question, true);
  };

  return (
    <NightOwlHero
      streak={19}
      level={14}
      onSubmit={handleSubmit}
    />
  );
}
