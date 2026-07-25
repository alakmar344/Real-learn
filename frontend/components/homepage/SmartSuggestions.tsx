"use client";

import { useEffect, useMemo, useState } from "react";
import { useProgressStore } from "@/store/progressStore";
import { useMounted } from "@/hooks/useMounted";

/**
 * Smart question suggestions — context-aware starter grid that eliminates
 * blank-input paralysis. Shows 6 suggestions: a mix of trending topics,
 * subject diversity, and the daily spark. Zero cognitive load: just tap.
 */

const TRENDING_TOPICS = [
  { q: "How does AI actually learn?", subject: "CS", icon: "🤖" },
  { q: "Why do we dream?", subject: "Biology", icon: "💤" },
  { q: "What causes inflation?", subject: "Economics", icon: "📈" },
  { q: "How did the universe begin?", subject: "Physics", icon: "🌌" },
  { q: "Why do civilizations fall?", subject: "History", icon: "🏛️" },
  { q: "How do vaccines work?", subject: "Biology", icon: "💉" },
  { q: "What is dark matter?", subject: "Physics", icon: "🔮" },
  { q: "How does photosynthesis work?", subject: "Biology", icon: "🌱" },
  { q: "Why is the ocean salty?", subject: "Chemistry", icon: "🌊" },
  { q: "How do black holes form?", subject: "Physics", icon: "🕳️" },
  { q: "What is compound interest?", subject: "Economics", icon: "💰" },
  { q: "How do neural networks learn?", subject: "CS", icon: "🧠" },
  { q: "Why did the Roman Empire collapse?", subject: "History", icon: "⚔️" },
  { q: "How does the immune system fight disease?", subject: "Biology", icon: "🛡️" },
  { q: "What makes earthquakes happen?", subject: "Physics", icon: "🌍" },
  { q: "How do airplanes stay in the air?", subject: "Physics", icon: "✈️" },
];

const SUBJECT_ICONS: Record<string, string> = {
  Physics: "⚡",
  Chemistry: "🧪",
  Economics: "📊",
  Biology: "🧬",
  CS: "💻",
  History: "📜",
  Geography: "🗺️",
  General: "📚",
};

interface Props {
  onSelect: (question: string) => void;
}

export default function SmartSuggestions({ onSelect }: Props) {
  const subjectsSeen = useProgressStore((s) => s.subjectsSeen);
  const lessonsCompleted = useProgressStore((s) => s.lessonsCompleted);

  const isMounted = useMounted();

  const deterministicSuggestions = useMemo(() => {
    const picked: typeof TRENDING_TOPICS = [];

    // 1. Prioritize subjects the user hasn't explored yet (diversity)
    const unseenSubjects = new Set(
      TRENDING_TOPICS.map((t) => t.subject).filter((s) => !subjectsSeen.includes(s))
    );
    const diverse = TRENDING_TOPICS.filter((t) => unseenSubjects.has(t.subject));
    for (const topic of diverse) {
      if (picked.length >= 2) break;
      if (!picked.includes(topic)) picked.push(topic);
    }

    // 2. Fill with trending topics the user HAS studied (reinforcement)
    const studied = TRENDING_TOPICS.filter(
      (t) => subjectsSeen.includes(t.subject) && !picked.includes(t)
    );
    for (const topic of studied) {
      if (picked.length >= 4) break;
      picked.push(topic);
    }

    return picked;
  }, [subjectsSeen]);

  const [suggestions, setSuggestions] = useState<typeof TRENDING_TOPICS>(() => {
    const picked = [...deterministicSuggestions];
    const remaining = TRENDING_TOPICS.filter((t) => !picked.includes(t));
    for (const topic of remaining) {
      if (picked.length >= 6) break;
      picked.push(topic);
    }
    return picked;
  });

  useEffect(() => {
    if (!isMounted) return;
    const picked = [...deterministicSuggestions];
    const remaining = TRENDING_TOPICS.filter((t) => !picked.includes(t));
    
    // Fisher-Yates shuffle remaining
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    for (const topic of remaining) {
      if (picked.length >= 6) break;
      picked.push(topic);
    }
    
    setSuggestions(picked);
  }, [deterministicSuggestions, isMounted]);

  // For returning users, show a personalized "Continue learning" header
  const isNewUser = lessonsCompleted === 0;

  return (
    <div style={{ marginTop: 16, width: "100%", maxWidth: 520 }}>
      <p
        style={{
          margin: "0 0 10px",
          fontSize: 13,
          color: "var(--text-tertiary)",
          fontWeight: 500,
          textAlign: "center",
        }}
      >
        {isNewUser ? "Popular questions to get you started" : "Explore something new"}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 8,
        }}
      >
        {suggestions.map((topic, i) => (
          <button
            key={`${topic.q}-${i}`}
            type="button"
            onClick={() => onSelect(topic.q)}
            className="rl-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 200ms var(--ease-spring)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              borderRadius: "var(--radius-lg)",
              fontSize: 13,
              color: "var(--text-primary)",
              fontWeight: 500,
              lineHeight: "1.3",
              minHeight: 48,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-accent)";
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>{topic.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {topic.q}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginTop: 2,
                }}
              >
                {SUBJECT_ICONS[topic.subject] ?? "📚"} {topic.subject}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
