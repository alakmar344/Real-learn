"use client";

import { useEffect, useState } from "react";

/**
 * A floating rangoli-seal scroll-to-top button. Appears after the user scrolls
 * one viewport down, fades out near the top, and respects reduced-motion
 * (the scroll is instant when the user has asked for less animation).
 */
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > window.innerHeight * 0.8);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      className={`scroll-top${visible ? " is-visible" : ""}`}
      aria-label="Scroll back to top"
      title="Back to top ↑"
      onClick={handleClick}
      onKeyDown={handleKey}
      tabIndex={visible ? 0 : -1}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4l-7 7M12 4l7 7M12 4v16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
