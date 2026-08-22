import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  message: string;
  onRetry?: () => void;
  onHome?: () => void;
}

export default function ErrorState({ message, onRetry, onHome }: Props) {
  const { t } = useTranslation();

  return (
    <main role="alert" className="error-state">
      <div className="error-state__card animate-fade-up">
        <span className="error-state__rule" aria-hidden="true" />
        <h2 className="error-state__title">{t("error.title")}</h2>
        <p className="error-state__message">{message}</p>
        <div className="error-state__actions">
          {onRetry && (
            <button type="button" onClick={onRetry} className="error-state__btn">
              {t("error.retry")}
            </button>
          )}
          {onHome && (
            <button type="button" onClick={onHome} className="error-state__btn error-state__btn--secondary">
              {t("error.goHome")}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
