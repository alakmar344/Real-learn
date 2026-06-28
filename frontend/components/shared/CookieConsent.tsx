"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

const COOKIE_CONSENT_KEY = "reallearn-cookie-consent";

interface CookieConsentState {
  accepted: boolean;
  timestamp: string;
}

export default function CookieConsent() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      setShowBanner(true);
    }
  }, [isSignedIn]);

  const saveConsent = async (accepted: boolean) => {
    setLoading(true);
    try {
      const email =
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        "";
      const clerkId = user?.id || "";

      let deviceIp = "unknown";
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        deviceIp = data.ip;
      } catch {
        // fallback
      }

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await fetch(`${backendUrl}/api/agreement`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          accepted,
          email,
          clerkId,
          deviceIp,
          timestamp: new Date().toISOString(),
        }),
      });

      const consent: CookieConsentState = {
        accepted,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
      setShowBanner(false);
    } catch (err) {
      console.error("[CookieConsent] Failed to save consent", err);
    } finally {
      setLoading(false);
    }
  };

  if (!showBanner || !isSignedIn) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-lg)",
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1024,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "var(--text-primary)",
              fontFamily: "var(--font-inter)",
              fontWeight: 500,
            }}
          >
            We use cookies to enhance your learning experience.
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-lora)",
            }}
          >
            Accept to enable all cookies, or decline to disable them.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => saveConsent(false)}
            disabled={loading}
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "transparent",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            Decline
          </button>
          <button
            onClick={() => saveConsent(true)}
            disabled={loading}
            style={{
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "#faf7f2",
              background: "var(--accent)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : "Accept All"}
          </button>
        </div>
      </div>
    </div>
  );
}
