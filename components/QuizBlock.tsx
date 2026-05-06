"use client";

import { useState } from "react";
import { Quiz, QuizQuestion } from "@/types";

interface QuizBlockProps {
  quiz: Quiz;
  onComplete?: (score: number) => void;
}

function QuestionCard({
  question,
  index,
  onAnswer,
  selectedIndex,
  isRevealed,
}: {
  question: QuizQuestion;
  index: number;
  onAnswer: (optionIndex: number) => void;
  selectedIndex: number | null;
  isRevealed: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-text-primary font-medium text-sm leading-relaxed">
        <span className="text-text-secondary mr-2">Q{index + 1}.</span>
        {question.question}
      </p>
      <div className="space-y-2">
        {question.options.map((option, optIndex) => {
          let optionClass =
            "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ";
          if (!isRevealed) {
            optionClass +=
              selectedIndex === optIndex
                ? "border-accent bg-accent-light text-text-primary"
                : "border-border bg-surface text-text-secondary hover:border-accent/50 hover:text-text-primary hover:bg-accent-light/50 cursor-pointer";
          } else {
            if (optIndex === question.correctIndex) {
              optionClass +=
                "border-emerald-400 bg-emerald-50 text-emerald-700";
            } else if (selectedIndex === optIndex) {
              optionClass += "border-red-400 bg-red-50 text-red-700";
            } else {
              optionClass += "border-border bg-surface text-text-secondary opacity-50";
            }
          }

          return (
            <button
              key={optIndex}
              className={optionClass}
              onClick={() => !isRevealed && onAnswer(optIndex)}
              disabled={isRevealed}
            >
              <span className="font-mono text-xs mr-3 opacity-60">
                {["A", "B", "C", "D"][optIndex]}.
              </span>
              {option}
              {isRevealed && optIndex === question.correctIndex && (
                <span className="ml-2 text-emerald-400">✓</span>
              )}
              {isRevealed &&
                selectedIndex === optIndex &&
                optIndex !== question.correctIndex && (
                  <span className="ml-2 text-red-400">✗</span>
                )}
            </button>
          );
        })}
      </div>
              {isRevealed && (
        <div className="p-3 bg-accent-light border border-accent/20 rounded-lg text-xs text-text-secondary leading-relaxed animate-fade-in">
          <span className="font-semibold text-accent mr-1">Explanation:</span>
          {question.explanation}
        </div>
      )}
    </div>
  );
}

export default function QuizBlock({ quiz, onComplete }: QuizBlockProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  );
  const [revealed, setRevealed] = useState<boolean[]>(
    new Array(quiz.questions.length).fill(false)
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleAnswer = (questionIndex: number, optionIndex: number) => {
    if (revealed[questionIndex]) return;
    const newAnswers = [...answers];
    newAnswers[questionIndex] = optionIndex;
    setAnswers(newAnswers);

    // Auto-reveal after selection
    const newRevealed = [...revealed];
    newRevealed[questionIndex] = true;
    setRevealed(newRevealed);
  };

  const handleSubmit = () => {
    const finalScore = quiz.questions.reduce((acc, q, i) => {
      return acc + (answers[i] === q.correctIndex ? 1 : 0);
    }, 0);
    setScore(finalScore);
    setSubmitted(true);
    // Reveal all
    setRevealed(new Array(quiz.questions.length).fill(true));
    onComplete?.(finalScore);
  };

  const allAnswered = answers.every((a) => a !== null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold text-text-secondary tracking-widest uppercase">
          Test Yourself
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-6">
        {quiz.questions.map((q, i) => (
          <div
            key={i}
          className="p-4 bg-surface border border-border rounded-xl shadow-sm"
          >
            <QuestionCard
              question={q}
              index={i}
              onAnswer={(optIndex) => handleAnswer(i, optIndex)}
              selectedIndex={answers[i]}
              isRevealed={revealed[i]}
            />
          </div>
        ))}
      </div>

      {!submitted && allAnswered && (
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-accent text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm tracking-wide shadow-md"
        >
          See My Score →
        </button>
      )}

      {submitted && score !== null && (
        <div className="p-4 bg-surface border border-accent/30 rounded-xl text-center animate-fade-in">
          <div className="text-3xl font-bold text-accent mb-1">
            {score}/{quiz.questions.length}
          </div>
          <p className="text-text-secondary text-sm">
            {score === quiz.questions.length
              ? "Perfect! You nailed it. 🎉"
              : score >= quiz.questions.length / 2
              ? "Good work! Keep reading to strengthen your understanding."
              : "Keep exploring — the concepts will click with more context."}
          </p>
        </div>
      )}
    </div>
  );
}
