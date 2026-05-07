"use client";

import { useMemo, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import ProgressRail from "@/components/learning/ProgressRail";
import PartCard from "@/components/learning/PartCard";
import QuizSheet from "@/components/learning/QuizSheet";
import CompletionScreen from "@/components/learning/CompletionScreen";
import FollowUpBox from "@/components/learning/FollowUpBox";
import UnlockAnimation from "@/components/learning/UnlockAnimation";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import { useLessonStore } from "@/store/lessonStore";
import { useLesson } from "@/hooks/useLesson";

export default function LearnPage() {
  const [quizPart, setQuizPart] = useState<1 | 2 | 3 | null>(null);
  const [showUnlockFx, setShowUnlockFx] = useState(false);

  const {
    question,
    lesson,
    isLoading,
    error,
    unlockedPart,
    completedParts,
    partScores,
    collapsedParts,
    passPart,
    togglePartCollapse,
    resetAll,
    showCompletion,
    showFollowUp,
  } = useLessonStore();

  const { generateLesson, restart } = useLesson();

  const totalScore = useMemo(() => {
    return (partScores[1] ?? 0) + (partScores[2] ?? 0) + (partScores[3] ?? 0);
  }, [partScores]);

  if (isLoading && question) {
    return <LoadingCinematic question={question} />;
  }

  if (!lesson) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: 24 }}>
        <p>{error ?? "No lesson loaded yet."}</p>
        <button
          type="button"
          onClick={restart}
          style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: "10px 14px", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}
        >
          Go Home
        </button>
      </main>
    );
  }

  const activePart = quizPart ? lesson.parts[quizPart - 1] : null;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(10,10,10,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border-subtle)" }}>
        <Navbar compact />
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 12px" }}>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginRight: 8 }}>Understanding:</span>
          <span
            style={{
              fontFamily: "var(--font-playfair)",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--gold-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "inline-block",
              maxWidth: "100%",
              verticalAlign: "bottom",
            }}
            title={lesson.question}
          >
            {lesson.question}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 64px" }}>
        <ProgressRail unlockedPart={unlockedPart} completedParts={completedParts} />

        {lesson.parts.map((part) => (
          <PartCard
            key={part.partNumber}
            part={part}
            isUnlocked={part.partNumber <= unlockedPart}
            isCompleted={completedParts.includes(part.partNumber)}
            isCollapsed={collapsedParts.includes(part.partNumber)}
            score={partScores[part.partNumber]}
            onStartQuiz={() => setQuizPart(part.partNumber)}
            onToggleCollapse={() => togglePartCollapse(part.partNumber)}
          />
        ))}

        {showCompletion ? <CompletionScreen lesson={lesson} totalScore={totalScore} /> : null}

        {showFollowUp ? (
          <FollowUpBox
            onSubmit={async (nextQuestion) => {
              await generateLesson(nextQuestion, false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : null}

        <button
          type="button"
          onClick={() => {
            resetAll();
            restart();
          }}
          style={{
            marginTop: 20,
            borderRadius: 10,
            border: "1px solid var(--border-default)",
            background: "transparent",
            color: "var(--text-secondary)",
            padding: "10px 14px",
            cursor: "pointer",
          }}
        >
          Learn Something New
        </button>
      </div>

      {activePart ? (
        <QuizSheet
          open={quizPart !== null}
          questions={activePart.quiz}
          onClose={() => setQuizPart(null)}
          onPass={(score) => {
            passPart(activePart.partNumber, score);
            setQuizPart(null);
            setShowUnlockFx(true);
            window.setTimeout(() => setShowUnlockFx(false), 850);
          }}
        />
      ) : null}

      <UnlockAnimation show={showUnlockFx} />
    </main>
  );
}
