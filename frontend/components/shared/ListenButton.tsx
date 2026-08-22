import { markdownToPlainText, speechLangFor, useEdgeTts } from "@/hooks/useSpeech";
import { useTranslation } from "@/hooks/useTranslation";

function SpeakerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="listen-btn__glyph">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
      <path d="M15.5 9a4.5 4.5 0 0 1 0 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 6.5a8 8 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  /** The (markdown) text to read aloud. */
  text: string;
  /** App language of the content, e.g. "Hindi". Defaults to English. */
  language?: string;
  /** Accessible label when idle. */
  label?: string;
}

export default function ListenButton({ text, language, label }: Props) {
  const { t } = useTranslation();
  const { supported, speaking, loading, error, speak, stop, clearError } = useEdgeTts();
  const idleLabel = label ?? t("audio.listenSection");

  const handleClick = () => {
    if (error) clearError();
    if (speaking) {
      stop();
    } else {
      speak(markdownToPlainText(text), speechLangFor(language));
    }
  };

  if (!supported) {
    return (
      <span
        aria-label={t("audio.unsupported")}
        title={t("audio.unsupported")}
        className="listen-btn listen-btn--unsupported"
      >
        <span aria-hidden="true" className="listen-btn__icon"><SpeakerIcon /></span>
        {t("learn.listen")}
      </span>
    );
  }

  const showError = Boolean(error);
  const stateClass = speaking
    ? " listen-btn--speaking"
    : showError
      ? " listen-btn--error"
      : "";

  return (
    <span className="listen-wrap">
      <button
        type="button"
        aria-pressed={speaking}
        aria-label={speaking ? t("audio.stopReading") : idleLabel}
        title={showError ? `${idleLabel} — ${error}` : speaking ? t("audio.stopReading") : idleLabel}
        onClick={handleClick}
        className={`listen-btn${stateClass}`}
      >
        <span aria-hidden="true" className="listen-btn__icon">
          {speaking ? (
            <span className="visual-waveform" aria-hidden="true">
              <span className="visual-waveform__bar" />
              <span className="visual-waveform__bar" />
              <span className="visual-waveform__bar" />
              <span className="visual-waveform__bar" />
            </span>
          ) : showError ? (
            "!"
          ) : (
            <SpeakerIcon />
          )}
        </span>
        {loading ? t("audio.generating") : speaking ? t("learn.stop") : showError ? t("common.retry") : t("learn.listen")}
      </button>
      {showError ? (
        <span role="alert" className="listen-error" title={error ?? undefined}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
