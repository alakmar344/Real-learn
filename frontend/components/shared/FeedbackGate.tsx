"use client";

import { useState } from "react";
import { useMounted } from "@/hooks/useMounted";
import { useProgressStore } from "@/store/progressStore";
import { isFeedbackEligible } from "@/lib/feedback";
import FeedbackPrompt from "@/components/learning/FeedbackPrompt";

/**
 * Centralized, placement-agnostic gate for the optional feedback prompt.
 *
 * Why this exists: the prompt must appear "anytime a day after" the user's
 * first lesson — including on a *return visit* (after a refresh or a later
 * session), not only in the moment of completion. Eligibility is computed here
 * from the persisted `firstLessonCompletedAt` timestamp, so the prompt shows
 * on whatever page the user lands on once the 24h window has elapsed. A local
 * `dismissed` flag prevents it from re-appearing within the same page view
 * after the user submits / snoozes / declines.
 */
export default function FeedbackGate() {
  const mounted = useMounted();
  const firstLessonCompletedAt = useProgressStore((s) => s.firstLessonCompletedAt);
  const [dismissed, setDismissed] = useState(false);

  if (!mounted) return null;
  if (dismissed) return null;
  if (!isFeedbackEligible(firstLessonCompletedAt)) return null;

  return <FeedbackPrompt onDone={() => setDismissed(true)} />;
}
