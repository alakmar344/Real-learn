"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLessonStore } from "@/store/lessonStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { Icon } from "@/components/shared/icons";
import MathText from "@/components/shared/MathText";
import { useTranslation } from "@/hooks/useTranslation";
import { TranslationKey } from "@/lib/i18n";

type StageKey =
  | "loading.stage.understand"
  | "loading.stage.research"
  | "loading.stage.ground"
  | "loading.stage.writeLesson"
  | "loading.stage.writeDirect"
  | "loading.stage.polish"
  | "loading.stage.craftQuizzes"
  | "loading.stage.craftQuiz";

type StageDef = {
  key: string;
  translationKey: StageKey;
  at: number;
  stages: string[];
};

const EXPLAIN_STAGES: StageDef[] = [
  { key: "understand", translationKey: "loading.stage.understand", at: 5, stages: ["starting", ""] },
  { key: "research", translationKey: "loading.stage.research", at: 15, stages: ["searching"] },
  { key: "ground", translationKey: "loading.stage.ground", at: 30, stages: ["searched"] },
  { key: "write", translationKey: "loading.stage.writeLesson", at: 45, stages: ["generating"] },
  { key: "polish", translationKey: "loading.stage.polish", at: 85, stages: ["generated"] },
  { key: "quiz", translationKey: "loading.stage.craftQuizzes", at: 95, stages: ["validating", "retrying"] },
];

const FAST_STAGES: StageDef[] = [
  { key: "understand", translationKey: "loading.stage.understand", at: 5, stages: ["starting", "searching", "searched", ""] },
  { key: "write", translationKey: "loading.stage.writeDirect", at: 45, stages: ["generating", "generated"] },
  { key: "quiz", translationKey: "loading.stage.craftQuiz", at: 95, stages: ["validating", "retrying"] },
];

const EXPLAIN_PARTS: { num: number; translationKey: TranslationKey; at: number }[] = [
  { num: 1, translationKey: "loading.part.foundation", at: 45 },
  { num: 2, translationKey: "loading.part.mechanism", at: 60 },
  { num: 3, translationKey: "loading.part.realWorld", at: 74 },
];

const FAST_PARTS: { num: number; translationKey: TranslationKey; at: number }[] = [
  { num: 1, translationKey: "loading.part.yourAnswer", at: 45 },
];

const facts = [
  "Short spaced sessions beat one giant cram — your brain saves in checkpoints, not one big file.",
  "Explaining a concept to a friend is the fastest way to lock it in. Group chat counts.",
  "Your brain literally rewires while you sleep — tonight it saves what you learn right now.",
  "Quizzing yourself beats re-reading every time. That's why the quizzes here aren't optional.",
  "Attention is trainable in both directions — feeds train it one way, this trains it back.",
  "Ideas stick when they connect to something you already care about. That's the whole trick.",
  "Asking the question already primed your brain to remember the answer. You're ahead.",
];

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Props {
  question: string;
  onCancel?: () => void;
  isRevealing?: boolean;
}

// The local timer only ever approaches this ceiling asymptotically; it can
// never claim 100% on its own. Real backend progress can push past it, and
// 100% is reserved for the actual completion/reveal signal.
const AUTO_PROGRESS_CEILING = 90;
const AUTO_PROGRESS_TAU_MS = 3400;

export default function LoadingCinematic({ question, onCancel, isRevealing = false }: Props) {
  const { t } = useTranslation();
  const progressPercent = useLessonStore((s) => s.progressPercent);
  const progressStage = useLessonStore((s) => s.progressStage);
  // The "taking longer than expected" banner is driven EXCLUSIVELY by this
  // backend-confirmed signal (resilient tier engaged or a real measured
  // delay) — it is never shown as a pre-emptive local guess.
  const notice = useLessonStore((s) => s.notice);
  const mode = usePreferenceStore((s) => s.mode);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const displayRef = useRef(0);
  // 0 sentinel — stamped with the real start time in the [question] effect
  // below (Date.now() must not run during render; render must stay pure).
  const startTimeRef = useRef(0);

  const isFast = mode === "fast";
  const stages = isFast ? FAST_STAGES : EXPLAIN_STAGES;
  const parts = isFast ? FAST_PARTS : EXPLAIN_PARTS;

  // Reset the local curve whenever a fresh question loads.
  useEffect(() => {
    startTimeRef.current = Date.now();
    displayRef.current = 0;
    setDisplayProgress(0);
  }, [question]);

  // Smoothly animate the bar so it always drifts forward — but honestly. The
  // local curve saturates toward ~90% while generation is genuinely still
  // running; real server progress events can lead it further, and only the
  // reveal signal drives it to 100%.
  // The interval reads live values through refs so it is created ONCE: with
  // progressPercent/isRevealing in the dep array, every streamed progress
  // event tore the interval down, rebuilt it, and reset its 100ms clock —
  // pure churn normally, and a visibly frozen bar if events ever arrived
  // faster than the tick.
  const progressPercentRef = useRef(progressPercent);
  const isRevealingRef = useRef(isRevealing);
  useEffect(() => {
    progressPercentRef.current = progressPercent;
  }, [progressPercent]);
  useEffect(() => {
    isRevealingRef.current = isRevealing;
  }, [isRevealing]);
  useEffect(() => {
    // The CSS reduced-motion kill-switch can't reach JS-driven motion: under
    // reduce, tick slower and snap straight to the target instead of easing —
    // progress stays honest without continuous animation.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const revealing = isRevealingRef.current;
      const latestPercent = progressPercentRef.current;
      const autoProgress =
        AUTO_PROGRESS_CEILING * (1 - Math.exp(-elapsed / AUTO_PROGRESS_TAU_MS));
      const realLead = latestPercent > 0 ? Math.min(latestPercent + 6, 99) : 0;
      const target = revealing ? 100 : Math.min(Math.max(autoProgress, realLead), 99);
      const rate = revealing || reduce ? 1 : 0.12;
      const eased = displayRef.current + (target - displayRef.current) * rate;
      const next = Math.min(100, Math.max(displayRef.current, eased));
      displayRef.current = next;
      setDisplayProgress(next);
    }, reduce ? 500 : 100);
    return () => window.clearInterval(id);
  }, []);

  // Rotate the encouraging facts so there's always something fresh to read.
  // Auto-advancing content stays frozen under reduced motion (WCAG 2.2.2).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  const pct = Math.min(100, Math.round(displayProgress));

  // The single "what's happening right now" line. The backend's real stage
  // token wins the instant it arrives; between events the smooth local curve
  // decides. This is what makes progress feel INTELLIGENT rather than faked.
  const activeIndex = useMemo(() => {
    const byStage = stages.findIndex((s) => s.stages.includes(progressStage));
    if (byStage !== -1) return byStage;
    // Fall back to the highest stage the honest progress has passed.
    let idx = 0;
    for (let i = 0; i < stages.length; i += 1) {
      if (displayProgress >= stages[i].at) idx = i;
    }
    return idx;
  }, [stages, progressStage, displayProgress]);

  return (
    <div
      role="group"
      aria-label={t(isFast ? "loading.generatingAnswer" : "loading.generatingLesson")}
      className={`lc${isRevealing ? " is-revealing" : ""}${notice ? " is-slow" : ""}`}
    >
      <div className="lc__aurora" aria-hidden="true">
        <span className="lc__aurora-blob lc__aurora-blob--a" />
        <span className="lc__aurora-blob lc__aurora-blob--b" />
      </div>

      <div className="lc__stage">
        {/* Progress dial — the distinctive centrepiece. */}
        <div
          className="lc__dial"
          style={{ "--lc-pct": pct } as React.CSSProperties}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("loading.progressLabel")}
        >
          <span className="lc__dial-track" aria-hidden="true" />
          <span className="lc__dial-fill" aria-hidden="true" />
          <span className="lc__dial-spark" aria-hidden="true" />
          <span className="lc__dial-core" aria-hidden="true">
            <span className="lc__dial-pct">{pct}</span>
            <span className="lc__dial-unit">%</span>
          </span>
        </div>

        {/* Live, honest status — snaps to the real backend stage. This coarse
            label is the ONLY polite live region, so screen readers hear each
            stage change (~a handful) instead of the 100ms percentage tick. */}
        <p className="lc__status" role="status" aria-live="polite">
          <span className="lc__status-pulse" aria-hidden="true" />
          {stages[activeIndex] ? t(stages[activeIndex].translationKey) : t("loading.stage.working")}
        </p>

        <p className="lc__question">
          <span className="lc__quote">&ldquo;</span>
          <MathText text={question} />
          <span className="lc__quote">&rdquo;</span>
        </p>

        {/* Part tracker — the lesson materialising, segment by segment. */}
        <div className="lc__parts" aria-hidden="true">
          {parts.map((part, i) => {
            const nextAt = parts[i + 1]?.at ?? 96;
            const span = Math.max(1, nextAt - part.at);
            const building = displayProgress >= part.at;
            const ready = isRevealing || displayProgress >= nextAt;
            const fill = ready
              ? 100
              : building
                ? Math.min(100, ((displayProgress - part.at) / span) * 100)
                : 0;
            return (
              <div
                key={part.num}
                className={`lc__part${ready ? " is-ready" : building ? " is-building" : ""}`}
              >
                <span className="lc__part-bar">
                  <span className="lc__part-bar-fill" style={{ width: `${fill}%` }} />
                </span>
                <span className="lc__part-label">
                  {ready ? (
                    <span className="lc__part-check">
                      <CheckIcon />
                    </span>
                  ) : null}
                  {t(part.translationKey)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stage checklist — compact, intelligent progress. */}
        <ul className="lc__steps">
          {stages.map((step, i) => {
            const done = i < activeIndex || (isRevealing && i <= activeIndex);
            const active = !done && i === activeIndex;
            const state = done ? "is-done" : active ? "is-active" : "is-pending";
            return (
              <li key={step.key} className={`lc__step ${state}`}>
                <span className={`lc__step-marker ${state}`} aria-hidden="true">
                  {done ? <CheckIcon /> : active ? <span className="lc__step-dot" /> : null}
                </span>
                {t(step.translationKey)}
              </li>
            );
          })}
        </ul>

        {/* Rotating fact. */}
        <div key={factIndex} className="lc__fact">
          <span aria-hidden="true" className="lc__fact-star">
            <Icon name="sparkle" size={12} />
          </span>
          <span className="lc__fact-text">{facts[factIndex]}</span>
        </div>

        {/* Fallback reassurance — ONLY once the backend confirms the slow path
            (resilient tier engaged or a genuine measured delay). Never before. */}
        {notice && (
          <div className="lc__slow animate-fade-up" role="status">
            <span className="lc__slow-orbit" aria-hidden="true" />
            <p className="lc__slow-text">
              <strong>{t("loading.slow.title")}</strong>{" "}
              {notice === "resilient-tier"
                ? t("loading.slow.resilient")
                : t("loading.slow.factCheck")}
            </p>
          </div>
        )}

        {onCancel && (
          <button type="button" onClick={onCancel} className="lc__cancel">
            {t("common.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
