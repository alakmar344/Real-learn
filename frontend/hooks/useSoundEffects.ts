"use client";

import { useEffect, useRef } from "react";

const AUDIO_CONTEXT = {
  correct: "/sounds/correct.mp3",
  unlock: "/sounds/unlock.mp3",
  achievement: "/sounds/achievement.mp3",
};

export function useHapticFeedback() {
  return {
    light: () => navigator.vibrate?.(15),
    medium: () => navigator.vibrate?.(30),
    heavy: () => navigator.vibrate?.(50),
    pattern: (pattern: number[]) => navigator.vibrate?.(pattern),
  };
}

export function useSoundEffects() {
  const playedRefs = useRef<Record<string, boolean>>({});

  const play = (type: keyof typeof AUDIO_CONTEXT) => {
    if (typeof window === "undefined" || playedRefs.current[type]) return;
    
    const audio = new Audio(AUDIO_CONTEXT[type]);
    audio.volume = 0.3;
    audio.play().catch(() => {});
    playedRefs.current[type] = true;
    setTimeout(() => playedRefs.current[type] = false, 1000);
  };

  return { play, playCorrect: () => play("correct"), playUnlock: () => play("unlock"), playAchievement: () => play("achievement") };
}