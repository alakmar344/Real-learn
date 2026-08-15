"use client";

/**
 * The app's ambient backdrop — a single static layer of soft radial-gradient
 * washes painted once by the compositor. No animation: a permanently-running
 * transform loop on a full-viewport fixed layer keeps a GPU layer alive and
 * costs battery/scroll headroom for a subliminal effect. The static wash
 * gives the same warmth for free. Hidden on the low performance tier
 * (see globals.css).
 */
export default function AmbientBackground() {
  return <div aria-hidden className="aurora-bg" />;
}
