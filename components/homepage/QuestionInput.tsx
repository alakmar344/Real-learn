"use client";

import { FormEvent, useEffect, useRef } from "react";
import ExampleQuestions from "@/components/homepage/ExampleQuestions";

interface Props {
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: () => void;
}

export default function QuestionInput({ question, setQuestion, onSubmit }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      style={{
        marginTop: 48,
        maxWidth: 640,
        width: "100%",
        borderRadius: 16,
        border: "1.5px solid var(--border-default)",
        background: "var(--bg-surface)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ padding: "20px 24px" }}>
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What do you want to understand today?"
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
            fontFamily: "var(--font-inter)",
          }}
        />
      </div>
      <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <ExampleQuestions />
        <button
          type="submit"
          disabled={!question.trim()}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--bg-primary)",
            background: question.trim() ? "var(--gold-primary)" : "#6d5a16",
            cursor: question.trim() ? "pointer" : "not-allowed",
            transition: "all 200ms var(--ease-color)",
          }}
        >
          Teach Me →
        </button>
      </div>
    </form>
  );
}
