"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import ConfirmModal from "@/components/shared/ConfirmModal";
import ThemeModal from "@/components/shared/ThemeModal";
import { useLessonStore } from "@/store/lessonStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useMounted } from "@/hooks/useMounted";
import { SavedJourney } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const mounted = useMounted();

  const { journeys, removeJourney } = useSavedJourneysStore();

  const [themeOpen, setThemeOpen] = useState(false);
  const [journeyToRemove, setJourneyToRemove] = useState<string | null>(null);

  const handleNewLesson = () => {
    onClose();
    router.push("/");
  };

  const handleOpenJourney = (journey: SavedJourney) => {
    const loadJourney = useLessonStore.getState().loadJourney;
    loadJourney(journey);
    onClose();
    router.push("/learn");
  };

  return (
    <>
      <div
        className={`app-sidebar-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`app-sidebar${open ? " open" : ""}`}
        aria-label="Sidebar"
      >
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <svg viewBox="0 0 120 40" fill="none" aria-hidden="true" style={{ width: 38, height: "auto" }}>
              <defs>
                <linearGradient id="sidebar-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <rect width="120" height="40" rx="12" fill="url(#sidebar-logo-gradient)" />
              <text x="10" y="27" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="18" fill="white">
                RL
              </text>
            </svg>
            <span
              style={{
                fontFamily: "var(--font-playfair)",
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: -0.5,
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>Real</span>
              <span
                style={{
                  background: "var(--accent-gradient)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Learn
              </span>
            </span>
            <button
              type="button"
              className="app-sidebar-close"
              aria-label="Close menu"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            onClick={handleNewLesson}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "var(--radius-lg)",
              padding: "12px 16px",
              background: "var(--accent-gradient)",
              color: "var(--on-accent)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              minHeight: 48,
              boxShadow: "var(--shadow-glow-accent)",
              transition: "all 200ms var(--ease-color)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "0 6px 24px var(--accent-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "var(--shadow-glow-accent)";
            }}
          >
            ＋ New lesson
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px" }}>
          <p
            style={{
              margin: "0 4px 8px",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              fontWeight: 600,
            }}
          >
            Saved lessons
          </p>

          {(!mounted || journeys.length === 0) ? (
            <p
              style={{
                margin: "8px 4px",
                fontSize: 13,
                color: "var(--text-tertiary)",
                fontStyle: "italic",
                lineHeight: 1.6,
              }}
            >
              Ask a question and your lesson will be saved here automatically. You can
              return anytime to continue where you left off.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {journeys.map((journey) => (
                <li key={journey.id} style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => handleOpenJourney(journey)}
                    title={journey.question}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "1px solid transparent",
                      borderRadius: "var(--radius-md)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      padding: "10px 34px 10px 10px",
                      cursor: "pointer",
                      display: "block",
                      transition: "background var(--dur-fast) var(--ease-color)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onFocus={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onBlur={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        lineHeight: 1.4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {journey.question}
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                      {journey.language} · {journey.level} · {journey.totalScore}/{(journey.lesson?.parts ?? []).reduce((sum, p) => sum + (p.quiz?.length ?? 2), 0) || (journey.lesson?.parts?.length ?? 3) * 2} ★
                      {(journey.completedParts ?? []).length < (journey.lesson?.parts?.length ?? 3) && (
                        <span> · Part {journey.unlockedPart ?? 1}</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Remove saved lesson"
                    onClick={() => setJourneyToRemove(journey.id)}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 6,
                      border: "none",
                      background: "transparent",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                      padding: 4,
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => setThemeOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              padding: "12px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              minHeight: 48,
              transition: "all 200ms var(--ease-color)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "var(--shadow-glow-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span>Theme</span>
            <span style={{ color: "var(--accent)", fontSize: 12 }}>Open</span>
          </button>

          {/* Settings */}
          {isLoaded && isSignedIn && (
            <button
              type="button"
              onClick={() => { onClose(); router.push("/settings"); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                padding: "12px 14px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                minHeight: 48,
                transition: "all 200ms var(--ease-color)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "var(--shadow-glow-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-subtle)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span>⚙️ Settings</span>
              <span style={{ color: "var(--accent)", fontSize: 12 }}>Account & data</span>
            </button>
          )}
        </div>
      </aside>

      <ThemeModal open={themeOpen} onClose={() => setThemeOpen(false)} />

      <ConfirmModal
        open={journeyToRemove !== null}
        title="Remove saved lesson?"
        message={
          journeyToRemove
            ? `Remove "${journeys.find((j) => j.id === journeyToRemove)?.question ?? "this lesson"}" from your saved lessons?`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => {
          if (journeyToRemove) removeJourney(journeyToRemove);
          setJourneyToRemove(null);
        }}
        onClose={() => setJourneyToRemove(null)}
      />
    </>
  );
}
