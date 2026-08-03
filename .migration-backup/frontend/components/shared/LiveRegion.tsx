"use client";

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
