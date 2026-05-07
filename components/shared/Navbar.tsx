"use client";

import LanguageSelector from "@/components/shared/LanguageSelector";
import LevelSelector from "@/components/shared/LevelSelector";
import { useLessonStore } from "@/store/lessonStore";

interface Props {
  compact?: boolean;
}

export default function Navbar({ compact = false }: Props) {
  const { language, level, setLanguage, setLevel } = useLessonStore();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: compact ? "auto" : 56,
        minHeight: 56,
        borderBottom: "1px solid var(--border-subtle)",
        background: compact ? "rgba(10,10,10,0.9)" : "rgba(10,10,10,0.55)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
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
        <div
          style={{
            fontFamily: "var(--font-playfair)",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: -0.4,
          }}
        >
          <span style={{ color: "var(--text-primary)" }}>Real</span>
          <span style={{ color: "var(--gold-primary)" }}>Learn</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LanguageSelector value={language} onChange={setLanguage} compact={compact} />
          <LevelSelector value={level} onChange={setLevel} compact={compact} />
        </div>
      </div>
    </header>
  );
}
