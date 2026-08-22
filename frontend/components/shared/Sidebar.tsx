"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLessonStore } from "@/store/lessonStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useLesson } from "@/hooks/useLesson";
import { getArchivedLesson } from "@/lib/lessonArchive";
import { useMounted } from "@/hooks/useMounted";
import { useShallow } from "zustand/shallow";
import { SavedJourney } from "@/types";
import { Icon } from "@/components/shared/icons";
import BrandMark from "@/components/shared/BrandMark";
import MathText from "@/components/shared/MathText";
import { useTranslation } from "@/hooks/useTranslation";

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

// Hoisted: Filter saved lessons by their question text (case- and accent-insensitive)
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function Sidebar({ open, onClose }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const mounted = useMounted();

  const { journeys, removeJourney } = useSavedJourneysStore(
    useShallow((state) => ({
      journeys: state.journeys,
      removeJourney: state.removeJourney,
    }))
  );
  const { generateLesson } = useLesson();
  const persistedTheme = usePreferenceStore((s) => s.theme);
  const setTheme = usePreferenceStore((s) => s.setTheme);
  // Hydration guard: the store hydrates from localStorage synchronously on
  // the client, but SSR always renders the "dark" default — so a light-theme
  // user would get a hydration mismatch on the switch label/aria-checked.
  // Render the server default until mounted (same pattern as the rest of the
  // theme-dependent surfaces).
  const theme = mounted ? persistedTheme : "dark";

  const [journeyToRemove, setJourneyToRemove] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const trimmedSearch = search.trim();
  const filteredJourneys = useMemo(() => {
    if (!trimmedSearch) return journeys;
    const searchNormalized = normalize(trimmedSearch);
    return journeys.filter((journey) =>
      normalize(journey.question).includes(searchNormalized)
    );
  }, [journeys, trimmedSearch]);

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
        id="app-sidebar"
        className={`app-sidebar${open ? " open" : ""}`}
        aria-label="Sidebar"
      >
        <div className="app-sidebar__head">
          <div className="app-sidebar__brand">
            <BrandMark className="app-sidebar__brand-mark" />
            <span className="app-sidebar__wordmark">
              Real<em>Learn</em>
            </span>
            <button
              type="button"
              className="app-sidebar-close btn-icon"
              aria-label={t("common.close")}
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
            <Icon name="plus" /> {t("sidebar.newLesson")}
          </button>
        </div>

        <div className="app-sidebar__scroll">
          <div className="app-sidebar__list-head">
            <p className="app-sidebar__list-title">{t("sidebar.savedLessons")}</p>
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
                placeholder={t("sidebar.searchPlaceholder")}
                aria-label={t("sidebar.searchPlaceholder")}
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
              {t("sidebar.emptyState")}
            </p>
          ) : filteredJourneys.length === 0 ? (
            <p className="app-sidebar__empty">
              {t("sidebar.noMatch", { query: trimmedSearch })}
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
                    <span className="journey-item__q"><MathText text={journey.question} /></span>
                    <span className="journey-item__meta">
                      {journey.language} · {journey.level} · {journey.totalScore}/{
                        (journey.lesson?.parts ?? []).reduce((sum, p) => sum + (p.quiz?.length ?? 2), 0) ||
                        journey.quizCount ||
                        (journey.lesson?.parts?.length ?? journey.partCount ?? 3) * 2
                      }{" "}
                      <Icon name="star-solid" size={10} label="points" />
                      {(journey.completedParts ?? []).length < (journey.lesson?.parts?.length ?? journey.partCount ?? 3) && (
                        <span> · {t("learn.partTag", { num: journey.unlockedPart ?? 1 })}</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={t("sidebar.removeConfirm")}
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
          <div className="app-sidebar__controls">
            {/* Physical tactile Theme Toggle */}
            <div
              className="theme-toggle-segmented"
              role="radiogroup"
              aria-label="Theme mode"
            >
              <button
                type="button"
                role="radio"
                aria-checked={theme === "light"}
                aria-label={t("sidebar.lightMode")}
                onClick={() => setTheme("light")}
                className={`theme-toggle-btn${theme === "light" ? " is-active" : ""}`}
                title={t("sidebar.lightMode")}
              >
                <Icon name="sun" size={15} className="theme-toggle-icon theme-toggle-icon--sun" />
                <span className="sr-only">{t("sidebar.lightMode")}</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === "dark"}
                aria-label={t("sidebar.darkMode")}
                onClick={() => setTheme("dark")}
                className={`theme-toggle-btn${theme === "dark" ? " is-active" : ""}`}
                title={t("sidebar.darkMode")}
              >
                <Icon name="moon" size={15} className="theme-toggle-icon theme-toggle-icon--moon" />
                <span className="sr-only">{t("sidebar.darkMode")}</span>
              </button>
            </div>

            {/* Icon-only Settings button with hover tooltip */}
            <div className="sidebar-tooltip">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/settings");
                }}
                className="btn-icon app-sidebar__settings-btn"
                aria-label={t("sidebar.settings")}
                title={t("sidebar.settings")}
              >
                <Icon name="settings" size={18} />
              </button>
              <span className="sidebar-tooltip__bubble" role="tooltip">
                {t("sidebar.settings")}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <ConfirmModal
        open={journeyToRemove !== null}
        title={t("sidebar.removeTitle")}
        message={
          journeyToRemove
            ? t("sidebar.removeMessage", { title: journeys.find((j) => j.id === journeyToRemove)?.question ?? "" })
            : ""
        }
        confirmLabel={t("sidebar.removeConfirm")}
        cancelLabel={t("sidebar.removeCancel")}
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
