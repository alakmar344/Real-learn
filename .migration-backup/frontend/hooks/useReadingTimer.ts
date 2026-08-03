"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * Reading timer that tracks how long a user has been reading content.
 * Uses requestAnimationFrame for smooth progress updates without
 * causing excessive re-renders (previous version used setInterval at
 * 100ms = 10 re-renders/second). State updates only happen at
 * meaningful progress thresholds (~2% increments) to minimize renders.
 */
export function useReadingTimer(
  isActive: boolean,
  durationInMs: number = 10000
) {
  const [startAt, setStartAt] = useState<number | null>(null);
  // Track progress as a percentage (0-100), updated at thresholds
  const [progressPct, setProgressPct] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const rafRef = useRef<number | null>(null);
  // Track last rendered progress to only update at meaningful thresholds
  const lastRenderedPctRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      setStartAt(null);
      setProgressPct(0);
      setIsComplete(false);
      lastRenderedPctRef.current = 0;
      return;
    }
    const startedAt = Date.now();
    setStartAt(startedAt);
    setProgressPct(0);
    setIsComplete(false);
    lastRenderedPctRef.current = 0;
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !startAt || isComplete) return;

    const tick = () => {
      const elapsed = Date.now() - startAt;
      const pct = Math.min((elapsed / durationInMs) * 100, 100);

      if (pct >= 100) {
        setProgressPct(100);
        setIsComplete(true);
        lastRenderedPctRef.current = 100;
        return; // Stop the loop
      }

      // Only trigger a state update (and thus a re-render) when progress
      // crosses a 2% threshold — ~50 renders total across the full
      // duration instead of hundreds.
      if (pct - lastRenderedPctRef.current >= 2) {
        lastRenderedPctRef.current = pct;
        setProgressPct(pct);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isActive, startAt, isComplete, durationInMs]);

  return useMemo(() => {
    if (!isActive || !startAt) {
      return { isComplete: false, remainingMs: durationInMs, progress: 0 };
    }
    const remainingMs = Math.max(0, durationInMs * (1 - progressPct / 100));
    return {
      isComplete,
      remainingMs,
      progress: progressPct,
    };
  }, [durationInMs, isActive, startAt, progressPct, isComplete]);
}
