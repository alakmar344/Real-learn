"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAchievementStore } from "@/store/achievementStore";
import { useNotificationStore } from "@/store/notificationStore";

interface Props {
  compact?: boolean;
}

export default function Navbar({ compact = false }: Props) {
  const totalXP = useAchievementStore((s) => s.totalXP);
  const level = useAchievementStore((s) => s.level);
  const streak = useAchievementStore((s) => s.streak);
  const checkStreak = useAchievementStore((s) => s.checkStreak);
  const getLevelTitle = useAchievementStore((s) => s.getLevelTitle);
  const permission = useNotificationStore((s) => s.permission);
  const requestPermission = useNotificationStore((s) => s.requestPermission);

  useEffect(() => {
    checkStreak();
  }, [checkStreak]);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: compact ? "auto" : 56,
        minHeight: 56,
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-glass)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="navbar-inner"
        style={{
          maxWidth: 1024,
          margin: "0 auto",
          padding: compact ? "12px 24px" : "0 24px",
          minHeight: compact ? "auto" : 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link
          href="/"
          aria-label="RealLearn – Home"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 40"
            fill="none"
            aria-hidden="true"
            style={{ width: 40, height: "auto" }}
          >
            <rect width="120" height="40" rx="8" fill="#1a3a5c" />
            <text x="10" y="27" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="18" fill="#faf7f2">
              RL
            </text>
          </svg>
          <span
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: -0.4,
            }}
          >
            <span style={{ color: "var(--text-primary)" }}>Real</span>
            <span style={{ color: "var(--accent)" }}>Learn</span>
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* XP and Level - always show on larger screens */}
          <div
            title={`${totalXP} XP • Level ${level} (${getLevelTitle()})`}
            className="nav-stats"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: "var(--radius-md)",
              background: "rgba(26,58,92,0.06)",
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span aria-hidden="true">★</span>
            <span>{totalXP}</span>
          </div>

          {/* Notification bell */}
          {permission !== "granted" && (
            <button
              type="button"
              onClick={() => requestPermission()}
              aria-label="Enable notifications"
              title="Enable notifications"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              🔔
            </button>
          )}

          {/* Streak indicator - mobile optimized */}
          <div
            title={`Current streak: ${streak} day${streak !== 1 ? "s" : ""}`}
            className="nav-streak"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              background: streak > 0 ? "rgba(26,107,58,0.1)" : "transparent",
              color: streak > 0 ? "var(--correct)" : "var(--text-tertiary)",
              fontSize: 14,
            }}
          >
            {streak > 0 ? "🔥" : "📖"}
          </div>
        </div>
      </div>

      <style jsx>{`
        .nav-stats {
          display: none;
        }
        @media (min-width: 640px) {
          .nav-stats {
            display: flex;
          }
        }
        @media (max-width: 900px) {
          .navbar-inner {
            padding-left: 64px !important;
          }
        }
      `}</style>
    </header>
  );
}