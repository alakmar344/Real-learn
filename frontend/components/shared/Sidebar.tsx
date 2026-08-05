"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";
import { useLessonStore } from "@/store/lessonStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useLesson } from "@/hooks/useLesson";
import { getArchivedLesson } from "@/lib/lessonArchive";
import { useMounted } from "@/hooks/useMounted";
import { useShallow } from "zustand/shallow";
import { SavedJourney } from "@/types";
import { Icon } from "@/components/shared/icons";

// Lazy-load modals — they are only needed when the user clicks to open them.
// This removes both components (and their deps, e.g. focus-trap hooks) from
// the initial JS bundle, cutting parse/compile time on first paint.
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
  const theme = usePreferenceStore((s) => s.theme);
  const setTheme = usePreferenceStore((s) => s.setTheme);

  const [journeyToRemove, setJourneyToRemove] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Filter saved lessons by their question text. With up to 100 saved lessons,
  // scrolling to find one is slow — a quick client-side filter (case- and
  // accent-insensitive) makes returning to any past lesson instant.
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const trimmedSearch = search.trim();
  const filteredJourneys = trimmedSearch
    ? journeys.filter((journey) =>
        normalize(journey.question).includes(normalize(trimmedSearch))
      )
    : journeys;

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
        <div className="app-sidebar__head">
          <div className="app-sidebar__brand">
            <Image src="/favicon.png" alt="" aria-hidden="true" width={38} height={38} className="app-sidebar__brand-mark" />
            <span className="app-sidebar__wordmark">
              Real<em>Learn</em>
            </span>
            <button
              type="button"
              className="app-sidebar-close btn-icon"
              aria-label="Close menu"
              onClick={onClose}
            >
              <Icon name="close" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleNewLesson}
            className="btn-primary app-sidebar__new"
          >
            <Icon name="plus" /> New lesson
          </button>
        </div>

        <div className="app-sidebar__scroll">
          <div className="app-sidebar__list-head">
            <p className="app-sidebar__list-title">Saved lessons</p>
            {mounted && journeys.length > 0 ? (
              <span className="app-sidebar__count">
                {trimmedSearch ? `${filteredJourneys.length}/${journeys.length}` : journeys.length}
              </span>
            ) : null}
          </div>

          {/* Search / filter — appears once there are enough lessons to be worth
              filtering. Instant, local, no network. */}
          {mounted && journeys.length > 4 ? (
            <div className="sidebar-search">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="sidebar-search__icon"
              >
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search saved lessons"
                aria-label="Search saved lessons"
                className="sidebar-search__input"
              />
              {trimmedSearch ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="sidebar-search__clear"
                >
                  <Icon name="close" size={12} />
                </button>
              ) : null}
            </div>
          ) : null}

          {(!mounted || journeys.length === 0) ? (
            <p className="app-sidebar__empty">
              Ask a question and your lesson will be saved here automatically. You can
              return anytime to continue where you left off.
            </p>
          ) : filteredJourneys.length === 0 ? (
            <p className="app-sidebar__empty">
              No saved lessons match “{trimmedSearch}”.
            </p>
          ) : (
            <ul className="journey-list">
              {filteredJourneys.map((journey) => (
                <li key={journey.id} className="journey-item">
                  <button
                    type="button"
                    onClick={() => void handleOpenJourney(journey)}
                    title={journey.question}
                    className="journey-item__open"
                  >
                    <span className="journey-item__q">{journey.question}</span>
                    <span className="journey-item__meta">
                      {journey.language} · {journey.level} · {journey.totalScore}/{
                        (journey.lesson?.parts ?? []).reduce((sum, p) => sum + (p.quiz?.length ?? 2), 0) ||
                        journey.quizCount ||
                        (journey.lesson?.parts?.length ?? journey.partCount ?? 3) * 2
                      }{" "}
                      <Icon name="star-solid" size={10} label="points" />
                      {(journey.completedParts ?? []).length < (journey.lesson?.parts?.length ?? journey.partCount ?? 3) && (
                        <span> · Part {journey.unlockedPart ?? 1}</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Remove saved lesson"
                    onClick={() => setJourneyToRemove(journey.id)}
                    className="journey-item__remove"
                  >
                    <Icon name="close" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="app-sidebar__foot">
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={theme === "dark" ? "Dark mode on — switch to light" : "Light mode on — switch to dark"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="theme-switch-row"
          >
            <span className="theme-switch-row__label">
              {theme === "dark" ? "Dark mode" : "Light mode"}
            </span>
            <span
              className={`theme-switch${theme === "dark" ? " theme-switch--on" : ""}`}
              aria-hidden="true"
            >
              <Icon name="sun" size={12} className="theme-switch__icon theme-switch__icon--sun" />
              <Icon name="moon" size={12} className="theme-switch__icon theme-switch__icon--moon" />
              <span className="theme-switch__thumb" />
            </span>
          </button>

          {/* Settings */}
          {isLoaded && isSignedIn && (
            <button
              type="button"
              onClick={() => { onClose(); router.push("/settings"); }}
              className="btn-ghost app-sidebar__foot-btn"
            >
              <span className="app-sidebar__foot-label">
                <Icon name="settings" /> Settings
              </span>
              <span className="app-sidebar__foot-note">Account & data</span>
            </button>
          )}
        </div>
      </aside>

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
