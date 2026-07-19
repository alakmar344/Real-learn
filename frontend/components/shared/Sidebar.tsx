"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";
import { useLessonStore } from "@/store/lessonStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useLesson } from "@/hooks/useLesson";
import { getArchivedLesson } from "@/lib/lessonArchive";
import { useMounted } from "@/hooks/useMounted";
import { useShallow } from "zustand/shallow";
import { SavedJourney } from "@/types";

// Lazy-load modals — they are only needed when the user clicks to open them.
// This removes both components (and their deps, e.g. focus-trap hooks) from
// the initial JS bundle, cutting parse/compile time on first paint.
const ThemeModal = dynamic(
  () => import("@/components/shared/ThemeModal"),
  { ssr: false }
);
const ConfirmModal = dynamic(
  () => import("@/components/shared/ConfirmModal"),
  { ssr: false }
);

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const mounted = useMounted();

  const { journeys, removeJourney } = useSavedJourneysStore(
    useShallow((state) => ({
      journeys: state.journeys,
      removeJourney: state.removeJourney,
    }))
  );
  const { generateLesson } = useLesson();

  const [themeOpen, setThemeOpen] = useState(false);
  const [journeyToRemove, setJourneyToRemove] = useState<string | null>(null);

  const handleNewLesson = () => {
    onClose();
    router.push("/");
  };

  const handleOpenJourney = async (journey: SavedJourney) => {
    onClose();
    const loadJourney = useLessonStore.getState().loadJourney;
    if (journey.lesson) {
      loadJourney({ ...journey, lesson: journey.lesson });
      router.push("/learn");
      return;
    }
    // Every chat's full lesson body lives in the local IndexedDB archive
    // (the store keeps only a lightweight index) — load it from there for
    // FREE (no LLM call, no cost).
    const archivedLesson = await getArchivedLesson(journey.id);
    if (archivedLesson) {
      loadJourney({ ...journey, lesson: archivedLesson });
      router.push("/learn");
      return;
    }
    // Last resort only (archive copy is gone — cleared site data or a new
    // device): regenerate the lesson, which is usually a server-cache hit.
    void generateLesson(journey.question, true);
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
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <svg viewBox="0 0 120 40" fill="none" aria-hidden="true" style={{ width: 38, height: "auto" }}>
              <defs>
                <linearGradient id="sidebar-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5b5bd6" />
                  <stop offset="100%" stopColor="#7c6eef" />
                </linearGradient>
              </defs>
              <rect width="120" height="40" rx="12" fill="url(#sidebar-logo-gradient)" />
              <text x="10" y="27" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="18" fill="white">
                RL
              </text>
            </svg>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: -0.5,
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>Real</span>
              <span style={{ color: "var(--accent)" }}>Learn</span>
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
              padding: "14px 18px",
               background: "var(--accent)",
               color: "var(--on-accent)",
               fontWeight: 700,
               fontSize: 14,
               cursor: "pointer",
               minHeight: 52,
              boxShadow: "var(--shadow-glow-accent)",
              transition: "all 200ms var(--ease-color)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
          >
            ＋ New lesson
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 10px" }}>
          <p
            style={{
              margin: "0 6px 10px",
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
                margin: "10px 6px",
                fontSize: 13,
                color: "var(--text-tertiary)",
                fontStyle: "italic",
                lineHeight: 1.7,
              }}
            >
              Ask a question and your lesson will be saved here automatically. You can
              return anytime to continue where you left off.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {journeys.map((journey) => (
                <li key={journey.id} style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => void handleOpenJourney(journey)}
                    title={journey.question}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "1px solid transparent",
                      borderRadius: "var(--radius-md)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      padding: "12px 38px 12px 12px",
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
                      {journey.language} · {journey.level} · {journey.totalScore}/{
                        (journey.lesson?.parts ?? []).reduce((sum, p) => sum + (p.quiz?.length ?? 2), 0) ||
                        journey.quizCount ||
                        (journey.lesson?.parts?.length ?? journey.partCount ?? 3) * 2
                      } ★
                      {(journey.completedParts ?? []).length < (journey.lesson?.parts?.length ?? journey.partCount ?? 3) && (
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
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
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
              padding: "14px 18px",
               cursor: "pointer",
               fontSize: 13,
               fontWeight: 500,
               minHeight: 52,
              transition: "all 200ms var(--ease-color)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
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
              padding: "14px 18px",
               cursor: "pointer",
               fontSize: 13,
               fontWeight: 500,
               minHeight: 52,
                transition: "all 200ms var(--ease-color)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-subtle)";
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
