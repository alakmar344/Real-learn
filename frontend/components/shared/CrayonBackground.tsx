"use client";

/**
 * The app's ambient backdrop, two GPU-cheap layers:
 *  1. `.aurora-bg` — huge radial-gradient washes drifting on 70–110s loops
 *     (transform-only animation, no blur filters, no repaints). Gives the
 *     page a soft "breathing" warmth.
 *  2. `.crayon-bg` — the static hand-drawn crayon scene, masked and tinted
 *     so it rests below the reading line with a sophisticated, mature feel.
 * Both are hidden on the low performance tier and freeze under
 * prefers-reduced-motion (see globals.css).
 */
export default function CrayonBackground() {
  return (
    <>
      <div aria-hidden className="aurora-bg">
        <div className="aurora-blob aurora-a" />
        <div className="aurora-blob aurora-b" />
        <div className="aurora-blob aurora-c" />
      </div>
      <div
        aria-hidden
        className="crayon-bg"
        style={{
          animation: "crayonReveal 1.8s var(--ease-reveal) both",
        }}
      />
    </>
  );
}
