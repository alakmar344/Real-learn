"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import ConfirmModal from "@/components/shared/ConfirmModal";
import ThemeModal from "@/components/shared/ThemeModal";
import { useLessonStore } from "@/store/lessonStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useLesson } from "@/hooks/useLesson";
import { getArchivedLesson } from "@/lib/lessonArchive";
import { useMounted } from "@/hooks/useMounted";
import { useShallow } from "zustand/shallow";
import { SavedJourney } from "@/types";

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
    const archivedLesson = await getArchivedLesson(journey.id);
    if (archivedLesson) {
      loadJourney({ ...journey, lesson: archivedLesson });
      router.push("/learn");
      return;
    }
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
        style={{
          background: "var(--bg-card)",
          borderRight: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
        }}
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
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "var(--accent-gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--on-accent)",
                fontWeight: 900,
                boxShadow: "var(--shadow-glow-accent)",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 120 40" fill="none">
                <rect width="120" height="40" rx="8" fill="currentColor" opacity="0.2" />
                <text x="10" y="27" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="18" fill="currentColor">
                  RL
                </text>
              </svg>
            </div>
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
              style={{
                marginLeft: "auto",
                width: 36,
                height: 36,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 250ms var(--ease-color)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-accent)";
                e.currentTarget.style.color = "var(--accent)";
                e.currentTarget.style.transform = "rotate(90deg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-subtle)";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.transform = "rotate(0deg)";
              }}
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            onClick={handleNewLesson}
            className="interactive-press"
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
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
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
            <div
              style={{
                margin: "10px 6px",
                fontSize: 13,
                color: "var(--text-tertiary)",
                fontStyle: "italic",
                lineHeight: 1.7,
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                border: "1px dashed var(--border-default)",
              }}
            >
              <span style={{ fontSize: 24, display: "block", marginBottom: 8, textAlign: "center" }}>📚</span>
              Ask a question and your lesson will be saved here automatically. You can
              return anytime to continue where you left off.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {journeys.map((journey) => (
                <li key={journey.id} style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => void handleOpenJourney(journey)}
                    title={journey.question}
                    className="interactive-lift"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "1px solid transparent",
                      borderRadius: "var(--radius-md)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      padding: "12px 38px 12px 14px",
                      cursor: "pointer",
                      display: "block",
                      transition: "all 250ms var(--ease-spring)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--bg-card-hover)";
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
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
                    <span style={{ display: "block", fontSize: 11, color: "var(--text-tertiary)", marginTop: 3, fontWeight: 500 }}>
                      {journey.language} · {journey.level} · {journey.totalScore}/{
                        (journey.lesson?.parts ?? []).reduce((sum, p) => sum + (p.quiz?.length ?? 2), 0) ||
                        journey.quizCount ||
                        (journey.lesson?.parts?.length ?? journey.partCount ?? 3) * 2
                      } ★
                      {(journey.completedParts ?? []).length < (journey.lesson?.parts?.length ?? journey.partCount ?? 3) && (
                        <span style={{ marginLeft: 6 }}>· Part {journey.unlockedPart ?? 1}</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Remove saved lesson"
                    onClick={() => setJourneyToRemove(journey.id)}
                    className="interactive-focus"
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 8,
                      border: "none",
                      background: "transparent",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                      padding: 6,
                      transition: "all 200ms var(--ease-color)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--wrong)";
                      e.currentTarget.style.transform = "scale(1.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-tertiary)";
                      e.currentTarget.style.transform = "scale(1)";
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
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => setThemeOpen(true)}
            className="interactive-lift"
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
              e.currentTarget.style.background = "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.background = "var(--bg-card)";
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden="true" style={{ fontSize: 16 }}>🎨</span>
              Theme
            </span>
            <span style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>Open</span>
          </button>

          {/* Settings */}
          {isLoaded && isSignedIn && (
            <button
              type="button"
              onClick={() => { onClose(); router.push("/settings"); }}
              className="interactive-lift"
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
                e.currentTarget.style.background = "var(--bg-card-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-subtle)";
                e.currentTarget.style.background = "var(--bg-card)";
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true" style={{ fontSize: 16 }}>⚙️</span>
                Settings
              </span>
              <span style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>Account & data</span>
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
