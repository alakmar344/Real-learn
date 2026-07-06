"use client";

import { useEffect, useMemo, useState } from "react";

export function useReadingTimer(
  isActive: boolean,
  durationInMs: number = 10000
) {
  const [startAt, setStartAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!isActive) {
      setStartAt(null);
      return;
    }
    // Reset `now` alongside startAt — otherwise a stale `now` from a previous
    // session makes elapsed negative and remainingMs exceed the duration.
    const startedAt = Date.now();
    setStartAt(startedAt);
    setNow(startedAt);
  }, [isActive]);

  const isComplete = Boolean(
    isActive && startAt && now - startAt >= durationInMs
  );

  useEffect(() => {
    // Stop ticking once complete — the old interval kept re-rendering the
    // component 10×/second forever after the timer finished.
    if (!isActive || !startAt || isComplete) return;

    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => window.clearInterval(id);
  }, [isActive, startAt, isComplete]);

  return useMemo(() => {
    if (!isActive || !startAt) {
      return { isComplete: false, remainingMs: durationInMs, progress: 0 };
    }
    const elapsed = Math.min(Math.max(now - startAt, 0), durationInMs);
    const remainingMs = Math.max(0, durationInMs - elapsed);
    return {
      isComplete: remainingMs <= 0,
      remainingMs,
      progress: (elapsed / durationInMs) * 100,
    };
  }, [durationInMs, isActive, now, startAt]);
}
