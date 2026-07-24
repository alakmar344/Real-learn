"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A thin accent bar pinned to the very top of the viewport that fills left→right
 * as the reader scrolls through the page. It gives a lesson a tangible sense of
 * length and momentum — you can see how much is left at a glance.
 *
 * Cheap by construction: the scroll handler only stores the latest ratio and
 * defers the actual style write to a single requestAnimationFrame, so fast
 * scrolling never triggers more than one layout write per frame. The bar is
 * decorative (aria-hidden) — progress is already conveyed structurally by the
 * ProgressRail and part cards.
 */
export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const compute = () => {
      frame.current = null;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const ratio = scrollable > 0 ? doc.scrollTop / scrollable : 0;
      // Clamp to [0,1] — rubber-band scrolling on iOS can overshoot both ends.
      setProgress(Math.min(1, Math.max(0, ratio)));
    };

    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 100,
        pointerEvents: "none",
        // Fully transparent until the reader actually starts moving.
        opacity: progress > 0.001 ? 1 : 0,
        transition: "opacity 200ms var(--ease-color)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          background: "var(--accent-gradient)",
          boxShadow: "0 0 8px var(--accent-glow)",
          borderRadius: "0 3px 3px 0",
          transformOrigin: "left center",
          transition: "width 80ms linear",
        }}
      />
    </div>
  );
}
