"use client";

export default function SkeletonLoader({ height = 16 }: { height?: number }) {
  return (
    <div
      className="animate-shimmer"
      role="progressbar"
      aria-label="Loading content"
      style={{
        height,
        width: "100%",
        borderRadius: "var(--radius-sm)",
      }}
    />
  );
}
