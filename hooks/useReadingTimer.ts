"use client";

import { useEffect, useMemo, useState } from "react";

export function useReadingTimer(isActive: boolean, durationMs: number = 10000) {
  const [startAt, setStartAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!isActive) {
      setStartAt(null);
      return;
    }
    setStartAt(Date.now());
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !startAt) return;

    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => window.clearInterval(id);
  }, [isActive, startAt]);

  return useMemo(() => {
    if (!isActive || !startAt) {
      return { isComplete: false, remainingMs: durationMs, progress: 0 };
    }
    const elapsed = now - startAt;
    const clamped = Math.min(Math.max(elapsed, 0), durationMs);
    const remainingMs = Math.max(0, durationMs - elapsed);
    const isComplete = remainingMs <= 0;
    return {
      isComplete,
      remainingMs,
      progress: (clamped / durationMs) * 100,
    };
  }, [durationMs, isActive, now, startAt]);
}
