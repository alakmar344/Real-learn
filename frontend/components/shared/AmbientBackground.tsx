"use client";

/**
 * The app's ambient backdrop — a single GPU-cheap layer:
 * `.aurora-bg` holds huge radial-gradient washes drifting on 70–110s loops
 * (transform-only animation, no blur filters, no repaints). It gives the
 * page a soft "breathing" depth without ever pulling focus — the Still Ink
 * design keeps the backdrop to paper, air and light.
 * Hidden on the low performance tier and frozen under
 * prefers-reduced-motion (see globals.css).
 */
export default function AmbientBackground() {
  return (
    <div aria-hidden className="aurora-bg">
      <div className="aurora-blob aurora-a" />
      <div className="aurora-blob aurora-b" />
      <div className="aurora-blob aurora-c" />
    </div>
  );
}
