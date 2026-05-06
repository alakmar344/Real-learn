"use client";

import { useState } from "react";
import { Quiz, QuizQuestion } from "@/types";

interface ValidationPhaseProps {
  quiz: Quiz;
  onComplete: () => void;
}

interface QuestionCardProps {
  question: QuizQuestion;
  questionNumber: number;
  total: number;
  onAnswer: (index: number) => void;
  selectedIndex: number | null;
  isRevealed: boolean;
  onNext: () => void;
  isLast: boolean;
}

function QuestionCard({
  question,
  questionNumber,
  total,
  onAnswer,
  selectedIndex,
  isRevealed,
  onNext,
  isLast,
}: QuestionCardProps) {
  const isCorrect = selectedIndex === question.correctIndex;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-text-secondary mb-1.5">
          <span>Question {questionNumber} of {total}</span>
          <span>{Math.round((questionNumber / total) * 100)}%</span>
        </div>
        <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${(questionNumber / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <p className="text-text-primary font-semibold text-base leading-relaxed">
        {question.question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option, i) => {
          let cls = "w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all ";
          if (!isRevealed) {
            cls +=
              selectedIndex === i
                ? "border-accent bg-accent-light text-text-primary"
                : "border-border bg-card text-text-secondary hover:border-accent/50 hover:text-text-primary cursor-pointer";
          } else {
            if (i === question.correctIndex) {
              cls += "border-emerald-500 bg-emerald-900/20 text-emerald-400";
            } else if (selectedIndex === i) {
              cls += "border-red-500 bg-red-900/20 text-red-400";
            } else {
              cls += "border-border bg-card text-text-secondary opacity-40";
            }
          }

          return (
            <button
              key={i}
              className={cls}
              onClick={() => !isRevealed && onAnswer(i)}
              disabled={isRevealed}
            >
              <span className="font-mono text-xs mr-3 opacity-60">
                {["A", "B", "C", "D"][i]}.
              </span>
              {option}
              {isRevealed && i === question.correctIndex && (
                <span className="ml-2 text-emerald-400">✓</span>
              )}
              {isRevealed && selectedIndex === i && i !== question.correctIndex && (
                <span className="ml-2 text-red-400">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {isRevealed && (
        <div className="p-3 bg-card border border-border rounded-lg text-xs text-text-secondary leading-relaxed animate-fade-in">
          <span className={`font-semibold mr-1 ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
            {isCorrect ? "Correct!" : "Not quite."}
          </span>
          {question.explanation}
        </div>
      )}

      {/* Navigation */}
      {isRevealed && (
        <button
          onClick={onNext}
          className="w-full py-3 bg-accent text-black font-bold rounded-lg hover:shadow-[0_0_16px_rgba(245,197,24,0.4)] transition-all text-sm"
        >
          {isLast ? "See Results →" : "Next Question →"}
        </button>
      )}
    </div>
  );
}

interface QuizResultsProps {
  score: number;
  total: number;
  onDeepen: () => void;
}

function QuizResults({ score, total, onDeepen }: QuizResultsProps) {
  const getMsg = () => {
    if (score === total) return "🎯 Perfect! You've mastered this concept. Ready to go deeper?";
    if (score === total - 1) return "💪 Great job! Let's deepen your understanding.";
    if (score === 1) return "📚 You're learning! Ask questions to solidify your knowledge.";
    return "🤔 Let's dig deeper and ask follow-ups to understand better.";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center py-6">
        <div className="text-5xl font-bold text-accent mb-2">
          {score} / {total}
        </div>
        <p className="text-text-primary text-base leading-relaxed">{getMsg()}</p>
      </div>

      <button
        onClick={onDeepen}
        className="w-full py-3 bg-accent text-black font-bold rounded-lg hover:shadow-[0_0_16px_rgba(245,197,24,0.4)] transition-all text-sm"
      >
        Unlock Part 3: Ask Your Own Questions →
      </button>
    </div>
  );
}

export default function ValidationPhase({ quiz, onComplete }: ValidationPhaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  );
  const [revealed, setRevealed] = useState<boolean[]>(
    new Array(quiz.questions.length).fill(false)
  );
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (optionIndex: number) => {
    if (revealed[currentIndex]) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
    const newRevealed = [...revealed];
    newRevealed[currentIndex] = true;
    setRevealed(newRevealed);
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const score = answers.reduce((acc, a, i) => {
    return acc + (a === quiz.questions[i].correctIndex ? 1 : 0);
  }, 0);

  if (showResults) {
    return (
      <QuizResults
        score={score}
        total={quiz.questions.length}
        onDeepen={onComplete}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-text-primary font-bold text-lg">Test Your Understanding</h3>
        <p className="text-text-secondary text-sm">Answer each question to unlock the next phase</p>
      </div>

      <QuestionCard
        question={quiz.questions[currentIndex]}
        questionNumber={currentIndex + 1}
        total={quiz.questions.length}
        onAnswer={handleAnswer}
        selectedIndex={answers[currentIndex]}
        isRevealed={revealed[currentIndex]}
        onNext={handleNext}
        isLast={currentIndex === quiz.questions.length - 1}
      />
    </div>
  );
}
