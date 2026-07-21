"use client";

interface Props {
  message: string;
  onRetry?: () => void;
  onHome?: () => void;
}

export default function ErrorState({ message, onRetry, onHome }: Props) {
  return (
    <main role="alert" className="error-state">
      <div className="error-state__card animate-fade-up">
        <span className="error-state__rule" aria-hidden="true" />
        <h2 className="error-state__title">Let&apos;s try that once more</h2>
        <p className="error-state__message">{message}</p>
        <div className="error-state__actions">
          {onRetry && (
            <button type="button" onClick={onRetry} className="error-state__btn">
              Try Again
            </button>
          )}
          {onHome && (
            <button type="button" onClick={onHome} className="error-state__btn error-state__btn--secondary">
              Go Home
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
