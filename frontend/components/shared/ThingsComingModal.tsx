"use client";

import { useEffect, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: "🚀",
    tag: "Step 1 of 4 • Quick Start",
    title: "Things Coming: Ask Anything, Your Way",
    subtitle: "RealLearn AI turns any topic or question into a personalized, structured learning journey.",
    bullets: [
      "12 Indian Languages supported natively (Hindi, Marathi, Tamil, Bengali, Telugu, and more).",
      "Tailored for your level: Class 6–8, Class 9–10, or College & Lifelong Learner.",
      "Instant answers in Fast mode or deep exploration in Explain mode."
    ]
  },
  {
    icon: "⚡",
    tag: "Step 2 of 4 • Guided Journey",
    title: "3-Stage Deep-Dive Mastery",
    subtitle: "In Explain mode, complex subjects are broken down into three logical phases.",
    bullets: [
      "Part 1: Foundation — Core concepts & fundamental principles made simple.",
      "Part 2: Mechanism — How things actually work under the hood.",
      "Part 3: Real World — Live news grounding & practical applications."
    ]
  },
  {
    icon: "🎯",
    tag: "Step 3 of 4 • Active Learning",
    title: "100% Quiz Gate & Achievement Badges",
    subtitle: "We believe in active recall over passive reading.",
    bullets: [
      "Each part ends with a 2-question quiz.",
      "Score 100% to unlock the next level and advance your journey.",
      "Earn streak badges, track study habits, and build real mastery."
    ]
  },
  {
    icon: "✨",
    tag: "Step 4 of 4 • Invisible Comfort",
    title: "Audio Voiceovers, Shortcuts & Personal Themes",
    subtitle: "Designed for zero cognitive load and effortless learning.",
    bullets: [
      "Listen aloud to any lesson section with native Web Speech TTS.",
      "Use quick keyboard shortcuts (1–4 / A–D for quizzes, Ctrl+Enter to submit).",
      "Switch room moods anytime: Paper (cream day), Ink (night), or Dusk (twilight)."
    ]
  }
];

export default function ThingsComingModal({ open, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      } else if (e.key === "ArrowRight") {
        if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) setCurrentStep((s) => s - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentStep]);

  const handleDismiss = () => {
    try {
      localStorage.setItem("reallearn-things-coming-seen", "true");
    } catch {
      // ignore
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  if (!open) return null;

  const step = STEPS[currentStep];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Things Coming — RealLearn AI App Tour"
      className="things-coming-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "var(--scrim, rgba(15, 20, 25, 0.65))",
        backdropFilter: "blur(var(--blur-sm, 6px))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="things-coming-card animate-fade-up"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-lg)",
          borderRadius: "var(--radius-xl)",
          maxWidth: 580,
          width: "100%",
          padding: "32px 28px",
          position: "relative",
          outline: "none",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close tour"
          onClick={handleDismiss}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "transparent",
            border: "none",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            fontSize: 20,
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>

        {/* Step Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "var(--accent-dim)",
              fontSize: 18,
            }}
          >
            {step.icon}
          </span>
          <span
            className="chip__label"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-accent-strong)",
              background: "var(--accent-dim)",
              padding: "4px 10px",
              borderRadius: 12,
              letterSpacing: "0.02em",
            }}
          >
            {step.tag}
          </span>
        </div>

        {/* Title & Subtitle */}
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
            marginBottom: 8,
            lineHeight: 1.3,
          }}
        >
          {step.title}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {step.subtitle}
        </p>

        {/* Bullet Points */}
        <div
          style={{
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            padding: "16px 18px",
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {step.bullets.map((b, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14, marginTop: 1 }}>
                ✓
              </span>
              <span style={{ fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.5 }}>
                {b}
              </span>
            </div>
          ))}
        </div>

        {/* Step Indicator Dots */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to step ${idx + 1}`}
                onClick={() => setCurrentStep(idx)}
                style={{
                  width: idx === currentStep ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: idx === currentStep ? "var(--accent)" : "var(--border-default)",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  transition: "all 200ms ease",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            {currentStep > 0 && (
              <button
                type="button"
                className="btn-ghost"
                onClick={handlePrev}
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={handleNext}
              style={{ padding: "8px 20px", fontSize: 13 }}
            >
              {currentStep === STEPS.length - 1 ? "Get Started 🚀" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
