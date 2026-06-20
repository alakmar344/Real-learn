"use client";

/**
 * Visually-hidden live region for screen-reader announcements.
 * Place once at the app root. Call `announce(msg)` to speak to SRs.
 */

let announceFn: ((msg: string) => void) | null = null;

export function announce(msg: string) {
  announceFn?.(msg);
}

export default function LiveRegion() {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      id="sr-live-region"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {/* Content is injected by the announce() helper via DOM */}
    </div>
  );
}

/* Wire up announceFn on mount */
if (typeof window !== "undefined") {
  announceFn = (msg: string) => {
    const el = document.getElementById("sr-live-region");
    if (el) {
      el.textContent = "";
      /* Small delay forces SR to re-announce the same text if needed */
      requestAnimationFrame(() => {
        el.textContent = msg;
      });
    }
  };
}
