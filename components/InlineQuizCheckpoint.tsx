"use client";

import { useState } from "react";
import { QuizQuestion } from "@/types";

interface InlineQuizCheckpointProps {
  question: QuizQuestion;
  onContinue: () => void;
}

export default function InlineQuizCheckpoint({
  question,
  onContinue,
}: InlineQuizCheckpointProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
  };

  const isCorrect = selected === question.correctIndex;

  return (
    <div className="my-4 p-4 bg-surface border border-accent/30 rounded-xl space-y-3 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-accent tracking-widest uppercase">
          🧠 Quick Check
        </span>
      </div>
      <p className="text-sm font-medium text-text-primary leading-relaxed">
        {question.question}
      </p>
      <div className="space-y-2">
        {question.options.map((opt, idx) => {
          let cls =
            "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ";
          if (!revealed) {
            cls +=
              selected === idx
                ? "border-accent bg-accent-light text-text-primary"
                : "border-border bg-card text-text-secondary hover:border-accent/50 hover:text-text-primary cursor-pointer";
          } else {
            if (idx === question.correctIndex) {
              cls += "border-success bg-success-light text-success";
            } else if (selected === idx) {
              cls += "border-danger bg-danger-light text-danger";
            } else {
              cls += "border-border bg-card text-text-secondary opacity-40";
            }
          }
          return (
            <button key={idx} className={cls} onClick={() => handleSelect(idx)} disabled={revealed}>
              <span className="font-mono text-xs mr-2 opacity-60">
                {["A", "B", "C", "D"][idx]}.
              </span>
              {opt}
              {revealed && idx === question.correctIndex && (
                <span className="ml-2 text-success">✓</span>
              )}
              {revealed && selected === idx && idx !== question.correctIndex && (
                <span className="ml-2 text-danger">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="space-y-3 animate-fade-in">
          <div className="p-3 bg-accent-light/10 border border-accent/20 rounded-lg text-xs text-text-secondary leading-relaxed">
            <span className="font-semibold text-accent mr-1">
              {isCorrect ? "Correct! 🎉" : "Not quite —"}
            </span>
            {question.explanation}
          </div>
          <button
            onClick={onContinue}
            className="w-full py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue Reading →
          </button>
        </div>
      )}
    </div>
  );
}
