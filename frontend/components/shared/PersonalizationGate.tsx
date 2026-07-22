"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { usePreferenceStore } from "@/store/preferenceStore";
import {
  MAX_PERSONALIZATION_NOTES_CHARS,
  PERSONALIZATION_CHECKLIST_OPTIONS,
  sanitizeChecklist,
  sanitizeNotes,
  type LearningPreferences,
} from "@/lib/personalization";

function loadWasSkipped(): boolean {
  try {
    return window.localStorage.getItem("reallearn-personalization-skipped") === "true";
  } catch {
    return false;
  }
}

function saveSkipped(skipped: boolean): void {
  try {
    window.localStorage.setItem("reallearn-personalization-skipped", String(skipped));
  } catch {
    // ignore storage errors
  }
}

export default function PersonalizationGate() {
  const { isSignedIn } = useAuth();
  const personalization = usePreferenceStore((s) => s.personalization);
  const setPersonalization = usePreferenceStore((s) => s.setPersonalization);
  const markPersonalizationOnboarded = usePreferenceStore((s) => s.markPersonalizationOnboarded);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LearningPreferences>(personalization);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  const notesRemaining = useMemo(
    () => MAX_PERSONALIZATION_NOTES_CHARS - draft.notes.length,
    [draft.notes]
  );

  useEffect(() => {
    if (!isSignedIn) return;
    if (personalization.onboarded) return;
    if (loadWasSkipped()) return;
    // Wait a moment so the legal-consent modal has a chance to finish first.
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [isSignedIn, personalization.onboarded]);

  useEffect(() => {
    setDraft(personalization);
  }, [personalization]);

  const toggleChecklist = (option: string) => {
    setDraft((prev) => {
      const next = prev.checklist.includes(option)
        ? prev.checklist.filter((item) => item !== option)
        : [...prev.checklist, option];
      return { ...prev, checklist: sanitizeChecklist(next) };
    });
  };

  const handleNotesChange = (value: string) => {
    setDraft((prev) => ({ ...prev, notes: sanitizeNotes(value) }));
  };

  const handleSave = () => {
    setPersonalization({ ...draft, onboarded: true });
    setOpen(false);
  };

  const handleSkip = () => {
    markPersonalizationOnboarded();
    saveSkipped(true);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personalize your learning"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 190,
        background: "var(--scrim, rgba(0,0,0,0.6))",
        backdropFilter: "blur(var(--blur-sm, 4px))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="animate-fade-up"
        style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-xl)",
          padding: "32px 28px",
          maxWidth: 600,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <span className="section-overline" style={{ marginBottom: 8 }}>
          Make It Yours
        </span>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 22,
            marginBottom: 8,
          }}
        >
          Personalize your learning
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
          Optional: tell us how you learn best. This helps RealLearn tailor explanations to you.
          Everything here stays on this device.
        </p>

        <fieldset style={{ border: "none", padding: 0, margin: "0 0 20px" }}>
          <legend
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 10,
            }}
          >
            Select any that apply
          </legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PERSONALIZATION_CHECKLIST_OPTIONS.map((option) => (
              <label
                key={option}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  background: draft.checklist.includes(option)
                    ? "var(--accent-dim)"
                    : "var(--bg-surface)",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--text-primary)",
                  lineHeight: 1.4,
                }}
              >
                <input
                  type="checkbox"
                  checked={draft.checklist.includes(option)}
                  onChange={() => toggleChecklist(option)}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div style={{ marginBottom: 24 }}>
          <label
            htmlFor="personalization-notes"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 8,
            }}
          >
            Anything else you&apos;d like us to know?
          </label>
          <textarea
            id="personalization-notes"
            value={draft.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="For example: I understand concepts better with pictures, or I need extra time with new vocabulary..."
            rows={4}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontSize: 14,
              lineHeight: 1.6,
              resize: "vertical",
              minHeight: 100,
            }}
          />
          <p
            style={{
              fontSize: 12,
              color: notesRemaining < 0 ? "var(--wrong)" : "var(--text-tertiary)",
              marginTop: 6,
              textAlign: "right",
            }}
          >
            {draft.notes.length}/{MAX_PERSONALIZATION_NOTES_CHARS}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn-ghost" onClick={handleSkip}>
            Skip for now
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
