"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { showToast } from "./ToastContainer";

/**
 * Hidden delights, none of them announced, all of them findable:
 *
 *  1. Konami code (↑↑↓↓←→←→BA)  → confetti storm + secret toast.
 *  2. Typing "magic" or "love" anywhere outside an input → floating hearts.
 *  3. Clicking the RealLearn wordmark in the footer 5× → heart burst
 *     (Footer dispatches a `reallearn:egg` CustomEvent; we listen here).
 *  4. Quiet once-per-day moments: night-owl / early-bird greetings and a few
 *     special dates. Guarded by localStorage so they never nag.
 *
 * Everything renders pointer-events:none and cleans itself up, so eggs can
 * never block the actual learning.
 */

const KONAMI = [
  "arrowup", "arrowup", "arrowdown", "arrowdown",
  "arrowleft", "arrowright", "arrowleft", "arrowright",
  "b", "a",
];

const SECRET_WORDS: Record<string, string> = {
  magic: "✨ You typed it — and a little magic appeared. Keep believing.",
  love: "💛 We love that you're here. Truly.",
};

const CONFETTI_COLORS = ["#b8860b", "#e0b341", "#caa84a", "#c2410c", "#2f8f4e", "#c9950f", "#d08a5e"];
const HEARTS = ["💛", "💜", "💙", "💚", "🧡", "❤️", "💖"];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Show a toast at most once per day per moment-id. */
function onceToday(id: string, fn: () => void) {
  try {
    const key = `reallearn-egg-${id}-${todayKey()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    fn();
  } catch {
    // localStorage unavailable — skip quietly rather than risk nagging.
  }
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

interface Piece {
  id: number;
  left: number;
  delay: number;
  size: number;
  color: string;
  duration: number;
}

function ConfettiStorm() {
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      duration: 1.6 + Math.random() * 1.6,
    }))
  );
  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none", overflow: "hidden" }}
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: p.id % 3 === 0 ? "50%" : 2,
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s linear both`,
          }}
        />
      ))}
    </div>
  );
}

interface Heart {
  id: number;
  left: number;
  bottom: number;
  delay: number;
  size: number;
  emoji: string;
  duration: number;
}

function HeartBurst() {
  const [hearts] = useState<Heart[]>(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: 8 + Math.random() * 84,
      bottom: Math.random() * 20,
      delay: Math.random() * 0.7,
      size: 18 + Math.random() * 18,
      emoji: HEARTS[i % HEARTS.length],
      duration: 1.8 + Math.random() * 1.4,
    }))
  );
  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none", overflow: "hidden" }}
    >
      {hearts.map((h) => (
        <div
          key={h.id}
          style={{
            position: "absolute",
            bottom: `${h.bottom}%`,
            left: `${h.left}%`,
            fontSize: h.size,
            lineHeight: 1,
            animation: `heartFloat ${h.duration}s ${h.delay}s var(--ease-reveal) both`,
          }}
        >
          {h.emoji}
        </div>
      ))}
    </div>
  );
}

export default function EasterEggs() {
  const [burst, setBurst] = useState<null | { kind: "confetti" | "hearts"; nonce: number }>(null);
  const konamiIdx = useRef(0);
  const typedBuffer = useRef("");
  const clearTimer = useRef<number | null>(null);

  const fireBurst = useCallback((kind: "confetti" | "hearts") => {
    setBurst({ kind, nonce: Date.now() });
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => setBurst(null), 4200);
  }, []);

  // ── Keyboard eggs: Konami code + secret words ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Konami works even while focused in an input (it's all modifier-free
      // arrows/letters, and we never preventDefault).
      konamiIdx.current = key === KONAMI[konamiIdx.current]
        ? konamiIdx.current + 1
        : key === KONAMI[0] ? 1 : 0;
      if (konamiIdx.current === KONAMI.length) {
        konamiIdx.current = 0;
        fireBurst("confetti");
        showToast("🎮 Konami code! You're officially one of us now.", "success");
        return;
      }

      // Secret words only count OUTSIDE form fields, so normal typing
      // never triggers them.
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (key.length !== 1 || !/[a-z]/.test(key)) {
        if (key !== "shift") typedBuffer.current = "";
        return;
      }
      typedBuffer.current = (typedBuffer.current + key).slice(-12);
      for (const [word, message] of Object.entries(SECRET_WORDS)) {
        if (typedBuffer.current.endsWith(word)) {
          typedBuffer.current = "";
          fireBurst("hearts");
          showToast(message, "info");
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fireBurst]);

  // ── Custom-event eggs (e.g. Footer wordmark ×5) ──
  useEffect(() => {
    const onEgg = (e: Event) => {
      const detail = (e as CustomEvent).detail as { kind?: string; message?: string } | undefined;
      fireBurst(detail?.kind === "confetti" ? "confetti" : "hearts");
      if (detail?.message) showToast(detail.message, "info");
    };
    window.addEventListener("reallearn:egg", onEgg);
    return () => window.removeEventListener("reallearn:egg", onEgg);
  }, [fireBurst]);

  // ── Quiet once-per-day moments ──
  useEffect(() => {
    const t = window.setTimeout(() => {
      const now = new Date();
      const h = now.getHours();
      const month = now.getMonth() + 1;
      const day = now.getDate();

      if (month === 1 && day === 1) {
        onceToday("newyear", () => {
          fireBurst("confetti");
          showToast("🎆 Happy New Year! A whole year of curiosity awaits.", "success");
        });
      } else if (month === 11 && day === 14) {
        onceToday("childrensday", () =>
          showToast("🎈 Happy Children's Day! Stay curious forever.", "info")
        );
      } else if (month === 9 && day === 5) {
        onceToday("teachersday", () =>
          showToast("🍎 Happy Teachers' Day — today, the world is your teacher.", "info")
        );
      } else if (h >= 0 && h < 4) {
        onceToday("nightowl", () =>
          showToast("🦉 Night owl! The quietest hours make the deepest thoughts.", "info")
        );
      } else if (h >= 4 && h < 7) {
        onceToday("earlybird", () =>
          showToast("🌅 Early bird! The world is still asleep — but your mind is awake.", "info")
        );
      }
    }, 2500); // Let the page settle first; delight should never race the UI.
    return () => window.clearTimeout(t);
  }, [fireBurst]);

  useEffect(() => () => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
  }, []);

  if (!burst) return null;
  return burst.kind === "confetti"
    ? <ConfettiStorm key={burst.nonce} />
    : <HeartBurst key={burst.nonce} />;
}
