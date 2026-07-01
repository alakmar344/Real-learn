"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import LanguageSelector from "@/components/shared/LanguageSelector";
import LevelSelector from "@/components/shared/LevelSelector";
import ConfirmModal from "@/components/shared/ConfirmModal";
import ThemeModal from "@/components/shared/ThemeModal";
import { useLessonStore } from "@/store/lessonStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useThemeStore } from "@/store/themeStore";
import { SavedJourney } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  const { language, level, setLanguage, setLevel, loadJourney, resetForNextQuestion } =
    useLessonStore();
  const { journeys, removeJourney } = useSavedJourneysStore();
  const theme = useThemeStore((s) => s.theme);

  const [themeOpen, setThemeOpen] = useState(false);
  const [journeyToRemove, setJourneyToRemove] = useState<string | null>(null);

  const handleNewLesson = () => {
    resetForNextQuestion("");
    onClose();
    router.push("/");
  };

  const handleOpenJourney = (journey: SavedJourney) => {
    console.log("[frontend][Sidebar] open journey", { id: journey.id });
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
        {/* Header */}
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
              gap: 8,
              marginBottom: 14,
            }}
          >
            <svg viewBox="0 0 120 40" fill="none" aria-hidden="true" style={{ width: 36, height: "auto" }}>
              <rect width="120" height="40" rx="8" fill="#1a3a5c" />
              <text x="10" y="27" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="18" fill="#faf7f2">
                RL
              </text>
            </svg>
            <span
              style={{
                fontFamily: "var(--font-playfair)",
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: -0.4,
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
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              background: "var(--accent)",
              color: "#faf7f2",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            ＋ New lesson
          </button>
        </div>

        {/* Saved journeys */}
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

          {journeys.length === 0 ? (
            <p
              style={{
                margin: "8px 4px",
                fontSize: 13,
                color: "var(--text-tertiary)",
                fontStyle: "italic",
                lineHeight: 1.6,
              }}
            >
              Complete a lesson and it&apos;ll be saved here so you can revisit it
              anytime.
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
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                      {journey.language} · {journey.level} · {journey.totalScore}/6 ★
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

        {/* Bottom controls */}
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600 }}>Level</span>
            <LevelSelector value={level} onChange={setLevel} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginTop: 2 }}>
              Language
            </span>
            <LanguageSelector value={language} onChange={setLanguage} />
          </div>

          <button
            type="button"
            onClick={() => setThemeOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              padding: "10px 12px",
              cursor: "pointer",
              fontSize: 13,
              minHeight: 44,
            }}
          >
            <span>{theme === "dark" ? "🌙 Night" : "☀️ Paper"} theme</span>
            <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Change</span>
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
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: 13,
                minHeight: 44,
              }}
            >
              <span>⚙️ Settings</span>
              <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Account & data</span>
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
