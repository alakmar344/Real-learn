"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

const FIRST_VISIT_KEY = "reallearn-first-visit";
const MILESTONES = new Set([7, 30, 100, 365]);

// "Day N of learning together" — a quiet local counter; rendered after mount
// to avoid hydration mismatch.
function CompanionDays() {
  const { t } = useTranslation();
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    try {
      let first = localStorage.getItem(FIRST_VISIT_KEY);
      if (!first || Number.isNaN(Number(first))) {
        first = String(Date.now());
        localStorage.setItem(FIRST_VISIT_KEY, first);
      }
      setDays(Math.max(1, Math.floor((Date.now() - Number(first)) / 86_400_000) + 1));
    } catch {
      // storage blocked (private mode) — skip
    }
  }, []);

  if (days === null) return null;

  const label = MILESTONES.has(days)
    ? t("footer.companionMilestone", { days })
    : days === 1
      ? t("footer.companionOne")
      : t("footer.companionDays", { days });

  return <p className="app-footer__companion">{label}</p>;
}

const Footer = ({ className }: { className?: string }) => {
  const { t } = useTranslation();

  return (
    <footer className={className}>
      <p className="app-footer__row">
        <span className="app-footer__brand">RealLearn</span>
        {/* suppressHydrationWarning: prerendered HTML cached across a year boundary
            would otherwise hydration-error on the year. */}
        <span suppressHydrationWarning>© {new Date().getFullYear()} alakmar344</span>
        <span aria-hidden="true">·</span>
        <span>{t("footer.aiDisclaimer")}</span>
      </p>
      <p className="app-footer__row app-footer__row--links">
        <a href="/legal?tab=privacy" className="app-footer__link">{t("footer.privacy")}</a>
        <span aria-hidden="true">·</span>
        <a href="/legal?tab=terms" className="app-footer__link">{t("footer.terms")}</a>
        <span aria-hidden="true">·</span>
        <a href="/legal" className="app-footer__link">{t("footer.legal")}</a>
        <span aria-hidden="true">·</span>
        <a href="mailto:esamzai365@gmail.com" className="app-footer__link">{t("footer.support")}</a>
      </p>
      <CompanionDays />
    </footer>
  );
};

export default Footer;
