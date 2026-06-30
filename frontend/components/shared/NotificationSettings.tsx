"use client";

import { useState } from "react";
import { useNotificationStore } from "@/store/notificationStore";

export default function NotificationSettings() {
  const { permission, preferences, requestPermission, updatePreferences } = useNotificationStore();
  const [showSettings, setShowSettings] = useState(false);

  const handleToggle = async (key: keyof typeof preferences) => {
    if (permission !== "granted") {
      await requestPermission();
    }
    updatePreferences({ [key]: !preferences[key] });
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={() => setShowSettings(!showSettings)}
        aria-expanded={showSettings}
        style={{
          width: "100%",
          textAlign: "left",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          background: "transparent",
          color: "var(--text-primary)",
          padding: "10px 12px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          minHeight: 44,
        }}
      >
        <span style={{ marginRight: 6 }}>🔔</span>
        Notification Settings
      </button>

      {showSettings && (
        <div
          className="animate-fade-up"
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={preferences.dailyReminder}
              onChange={() => handleToggle("dailyReminder")}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span>Daily learning reminders</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={preferences.achievementUnlocked}
              onChange={() => handleToggle("achievementUnlocked")}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span>Achievement unlocked alerts</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={preferences.streakMilestone}
              onChange={() => handleToggle("streakMilestone")}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span>Streak milestone notifications</span>
          </label>
        </div>
      )}
    </div>
  );
}