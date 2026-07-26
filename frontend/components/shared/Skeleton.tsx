"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  ariaLabel?: string;
}

/**
 * Solid-color, Soft-Pastel Skeleton loader.
 * Uses pure CSS opacity pulse with clean solid backgrounds — no overlapping
 * gradients or GPU layer forcing.
 */
export function Skeleton({
  className = "",
  style,
  width,
  height,
  borderRadius = "var(--radius-md, 8px)",
  ariaLabel = "Loading...",
}: SkeletonProps) {
  const combinedStyle: React.CSSProperties = {
    width: width ?? "100%",
    height: height ?? "100%",
    borderRadius: borderRadius,
    background: "var(--bg-surface, #F4F0E8)",
    border: "1px solid var(--border-subtle, #EBE6DC)",
    ...style,
  };

  return (
    <div
      className={`skeleton-pulse ${className}`.trim()}
      style={combinedStyle}
      role="status"
      aria-label={ariaLabel}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
  lineHeight = 16,
  gap = 10,
}: {
  lines?: number;
  className?: string;
  lineHeight?: number;
  gap?: number;
}) {
  return (
    <div
      className={`skeleton-text-group ${className}`.trim()}
      style={{ display: "flex", flexDirection: "column", gap }}
      role="status"
      aria-label="Loading text"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 && lines > 1 ? "65%" : "100%"}
          borderRadius="4px"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  height = 140,
  className = "",
  style,
}: {
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton-card-container ${className}`.trim()}
      style={{
        background: "var(--bg-card, #FFFDF8)",
        border: "1px solid var(--border-subtle, #EBE6DC)",
        borderRadius: "var(--radius-xl, 16px)",
        padding: "clamp(16px, 3vw, 22px)",
        boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))",
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        ...style,
      }}
      role="status"
      aria-label="Loading card"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Skeleton width={44} height={44} borderRadius="50%" />
        <div style={{ flex: 1 }}>
          <Skeleton height={18} width="40%" borderRadius="4px" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="75%" borderRadius="4px" />
        </div>
      </div>
      <Skeleton height={12} width="90%" borderRadius="4px" style={{ marginTop: 12 }} />
    </div>
  );
}

export function SkeletonTile({
  label = "",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`stat-tile ${className}`.trim()}
      style={{
        background: "var(--bg-surface, #F4F0E8)",
        border: "1px solid var(--border-subtle, #EBE6DC)",
        borderRadius: "var(--radius-lg, 12px)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
      role="status"
      aria-label={`Loading ${label || "stat"}`}
    >
      <Skeleton height={24} width="50%" borderRadius="4px" />
      <Skeleton height={12} width="80%" borderRadius="4px" />
    </div>
  );
}
