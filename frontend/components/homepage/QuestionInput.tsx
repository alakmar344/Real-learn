"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ExampleQuestions from "@/components/homepage/ExampleQuestions";

interface Props {
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: () => void;
}

export default function QuestionInput({ question, setQuestion, onSubmit }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [question]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Ask a question"
      style={{
        marginTop: 48,
        maxWidth: 640,
        width: "100%",
        borderRadius: "var(--radius-lg)",
        border: `1.5px solid ${focused ? "var(--accent)" : "var(--border-default)"}`,
        background: "var(--bg-card)",
        boxShadow: "var(--shadow-lg)",
        transition: "border-color 200ms var(--ease-color)",
      }}
    >
      <div style={{ padding: "20px 24px" }}>
        <label htmlFor="question-input" style={{ display: "none" }}>
          What do you want to understand today?
        </label>
        <textarea
          id="question-input"
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="What do you want to understand today?"
          aria-label="Your question"
          style={{
            width: "100%",
            minHeight: 56,
            maxHeight: 160,
            resize: "none",
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 16,
            lineHeight: 1.6,
            fontFamily: "var(--font-lora)",
          }}
        />
      </div>
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <ExampleQuestions />
        <button
          type="submit"
          disabled={!question.trim()}
          aria-label="Start learning"
          style={{
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: "#faf7f2",
            background: question.trim() ? "var(--accent)" : "var(--border-default)",
            cursor: question.trim() ? "pointer" : "not-allowed",
            transition: "all 200ms var(--ease-color)",
            minHeight: 44,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          Teach Me →
        </button>
      </div>
    </form>
  );
}
