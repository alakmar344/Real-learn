import { QuizQuestion as Question } from "@/types";

interface Props {
  question: Question;
  index: number;
  selectedIndex: number | null;
  answered: boolean;
  onSelect: (index: number) => void;
}

const letters = ["A", "B", "C", "D"];

export default function QuizQuestion({ question, index, selectedIndex, answered, onSelect }: Props) {
  return (
    <div>
      <p style={{ margin: 0, marginBottom: 8, fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>
        Question {index + 1} of 2
      </p>
      <p style={{ margin: 0, marginBottom: 16, fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
        {question.question}
      </p>
      <div>
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedIndex === optionIndex;
          const isCorrect = question.correctIndex === optionIndex;
          const showCorrectAnswer = answered && isCorrect;
          const isWrongSelected = answered && isSelected && !isCorrect;

          let background = "var(--bg-card)";
          let border = "1.5px solid var(--border-default)";
          let color = "#d0d0d0";

          if (showCorrectAnswer) {
            background = "rgba(16,185,129,0.08)";
            border = "1.5px solid rgba(16,185,129,0.45)";
            color = "var(--text-primary)";
          }

          if (isWrongSelected) {
            background = "var(--wrong-bg)";
            border = "1.5px solid var(--wrong)";
            color = "var(--text-primary)";
          }

          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => onSelect(optionIndex)}
              className={isWrongSelected ? "animate-shake" : showCorrectAnswer && isSelected ? "animate-correct-pulse" : undefined}
              style={{
                width: "100%",
                textAlign: "left",
                marginBottom: 8,
                borderRadius: 12,
                border,
                background,
                color,
                padding: "14px 16px",
                cursor: answered ? "default" : "pointer",
                fontSize: 14,
                transition: "all 150ms var(--ease-color)",
              }}
            >
              <span
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  width: 24,
                  height: 24,
                  marginRight: 12,
                  borderRadius: 6,
                  background: showCorrectAnswer ? "var(--correct)" : isWrongSelected ? "var(--wrong)" : "var(--border-default)",
                  color: showCorrectAnswer || isWrongSelected ? "white" : "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {letters[optionIndex]}
              </span>
              {option}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div
          className="animate-fade-up"
          style={{
            marginTop: 8,
            padding: "12px 16px",
            borderRadius: 10,
            borderLeft: `3px solid ${selectedIndex === question.correctIndex ? "var(--correct)" : "var(--wrong)"}`,
            background: "var(--bg-card)",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          {question.explanation}
        </div>
      ) : null}
    </div>
  );
}
