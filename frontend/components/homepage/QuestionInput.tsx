import { FormEvent, useEffect, useRef, useState, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import ExampleQuestions from "@/components/homepage/ExampleQuestions";
import MicButton from "@/components/shared/MicButton";
import { Icon } from "@/components/shared/icons";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useProgressStore } from "@/store/progressStore";
import { useMounted } from "@/hooks/useMounted";
import { warmupBackend, checkLessonCache, BACKEND_URL } from "@/lib/api";
import { Language } from "@/types";
import { LESSON_MODES as MODES } from "@/lib/lessonModes";
import { buildLearningContext } from "@/lib/learningProfile";
import { useTranslation } from "@/hooks/useTranslation";

const MAX_QUESTION_LENGTH = 1000;

interface Props {
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: () => void;
}

function preconnectBackend() {
  if (typeof document === "undefined") return;
  try {
    const origin = new URL(BACKEND_URL).origin;
    if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }
    if (!document.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`)) {
      const dnsLink = document.createElement("link");
      dnsLink.rel = "dns-prefetch";
      dnsLink.href = origin;
      document.head.appendChild(dnsLink);
    }
  } catch {
    // Best-effort preconnect
  }
}

export default function QuestionInput({ question, setQuestion, onSubmit }: Props) {
  const { t, dir, isRtl } = useTranslation();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialQuestionRef = useRef(question);
  const [focused, setFocused] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState("");
  const [cachedHint, setCachedHint] = useState<{ cached: boolean; expectedParts: number } | null>(null);
  const { isSignedIn, getToken } = useAuth();
  const language = usePreferenceStore((s) => s.language);
  const level = usePreferenceStore((s) => s.level);
  const persistedMode = usePreferenceStore((s) => s.mode);
  const setMode = usePreferenceStore((s) => s.setMode);
  const personalization = usePreferenceStore((s) => s.personalization);
  const journeys = useSavedJourneysStore((s) => s.journeys);
  const subjectsSeen = useProgressStore((s) => s.subjectsSeen);
  const mounted = useMounted();
  const mode = mounted ? persistedMode : "fast";
  const activeIndex = MODES.findIndex((m) => m.value === mode);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [question]);

  // Restore draft question on mount
  useEffect(() => {
    if (!mounted) return;
    try {
      const savedDraft = sessionStorage.getItem("reallearn_draft_question");
      if (savedDraft && !initialQuestionRef.current) {
        setQuestion(savedDraft);
      }
      if (window.innerWidth >= 768 && textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch {
      // Best-effort
    }
  }, [mounted, setQuestion]);

  // Persist draft question (debounced to avoid sync storage writes on every keystroke)
  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      try {
        if (question.trim()) {
          sessionStorage.setItem("reallearn_draft_question", question);
        } else {
          sessionStorage.removeItem("reallearn_draft_question");
        }
      } catch {
        // Best-effort
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [question, mounted]);

  // Predictive cache check: as the learner pauses typing, ask the backend if
  // this exact question is already cached. If so, show an "Instant answer"
  // badge so the UI feels prescient and the learner knows the response will
  // land immediately.
  useEffect(() => {
    if (!mounted || !isSignedIn) {
      setCachedHint(null);
      return;
    }
    const normalized = question.trim();
    if (!normalized) {
      setCachedHint(null);
      return;
    }
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const token = await getToken();
        const prefsPayload = personalization.onboarded ? personalization : null;
        const learningContext = buildLearningContext(
          journeys,
          subjectsSeen,
          normalized,
          prefsPayload?.goals ?? "",
          Date.now()
        );
        const result = await checkLessonCache({
          question: normalized,
          language,
          level,
          mode,
          token,
          personalization: prefsPayload,
          learningContext,
        });
        if (stale) return;
        if (result?.cached) {
          setCachedHint({ cached: true, expectedParts: result.expectedParts });
        } else {
          setCachedHint(null);
        }
      } catch {
        if (!stale) setCachedHint(null);
      }
    }, 350);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [question, language, level, mode, isSignedIn, getToken, mounted, personalization, journeys, subjectsSeen]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!question.trim()) return;
    if (!isSignedIn) {
      // Direct user into the linear onboarding flow — preserving draft in sessionStorage.
      if (question.trim()) {
        try {
          sessionStorage.setItem("reallearn_draft_question", question.trim());
        } catch {
          // ignore
        }
      }
      router.push("/onboarding");
      return;
    }
    try {
      sessionStorage.removeItem("reallearn_draft_question");
    } catch {
      // ignore
    }
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter submits; Shift+Enter inserts a new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Ask a question"
      className={`q-form${focused ? " q-form--focused" : ""}${isRtl ? " q-form--rtl" : ""}`}
    >
      {/* 1. Textarea Body */}
      <div className="q-form__body">
        <label htmlFor="question-input" className="sr-only">
          {t("hero.askLabel")}
        </label>
        <textarea
          id="question-input"
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => {
            preconnectBackend();
            warmupBackend();
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder={t("hero.askPlaceholder")}
          aria-label={t("hero.askLabel")}
          dir={dir}
          className={`q-form__textarea${isRtl ? " q-form__textarea--rtl" : ""}`}
        />
        {interimSpeech ? (
          <p aria-live="polite" className="q-form__listening">
            {t("hero.listening", { text: interimSpeech })}
          </p>
        ) : null}
      </div>

      {/* 2. Compact answer-mode toggle */}
      <div className="q-form__modes">
        <div role="radiogroup" aria-label="Answer mode" className="mode-glider">
          <span
            aria-hidden="true"
            className="mode-glider__pill"
            style={{
              width: `calc((100% - 8px) / ${MODES.length})`,
              transform: `translateX(calc(${activeIndex} * 100%))`,
            }}
          />
          {MODES.map((opt) => {
            const active = mode === opt.value;
            const label = opt.value === "fast" ? t("hero.mode.fast") : t("hero.mode.explain");
            const hint = opt.value === "fast" ? t("hero.mode.fastHint") : t("hero.mode.explainHint");
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                title={hint}
                onClick={() => setMode(opt.value)}
                className={`mode-glider__option${active ? " mode-glider__option--active" : ""}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Bottom Actions & Enter Button */}
      <div className="q-form__actions">
        <div className="q-form__actions-left">
          <ExampleQuestions onPick={(q) => {
            setQuestion(q);
            textareaRef.current?.focus();
          }} />
        </div>
        <div className="q-form__actions-right">
          <MicButton
            language={language}
            onTranscript={(text) =>
              setQuestion(
                (question.trim() ? `${question.trim()} ${text}` : text).slice(0, MAX_QUESTION_LENGTH)
              )
            }
            onInterim={setInterimSpeech}
          />
          {cachedHint?.cached && (
            <span className="q-form__instant-badge" title="This question is ready instantly">
              <Icon name="sparkle" size={12} />
              {t("hero.instantAnswer")}
            </span>
          )}
          {question.trim() && (
            <button
              type="button"
              aria-label={t("hero.clear")}
              title={t("hero.clear")}
              className="btn-icon btn-icon--danger"
              onClick={() => {
                setQuestion("");
                textareaRef.current?.focus();
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {isSignedIn ? (
            <button
              type="submit"
              disabled={!question.trim()}
              aria-label={t("hero.enter")}
              className="btn-primary q-form__enter-btn"
            >
              <span>{t("hero.enter")}</span>
              <span className="q-form__enter-symbol" aria-hidden="true">↵</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (question.trim()) {
                  try {
                    sessionStorage.setItem("reallearn_draft_question", question.trim());
                  } catch {
                    // ignore
                  }
                }
                router.push("/onboarding");
              }}
              aria-label={t("hero.signInToEnter")}
              className="btn-primary q-form__enter-btn"
            >
              <span>{t("hero.signInToEnter")}</span>
              <span className="q-form__enter-symbol" aria-hidden="true">↵</span>
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
