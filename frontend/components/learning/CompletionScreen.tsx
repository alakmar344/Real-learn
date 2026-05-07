import { LessonJourney } from "@/types";

interface Props {
  lesson: LessonJourney;
  totalScore: number;
}

export default function CompletionScreen({ lesson, totalScore }: Props) {
  return (
    <section
      className="animate-fade-up"
      style={{
        marginTop: 28,
        borderRadius: 20,
        border: "1px solid rgba(16,185,129,0.3)",
        background: "rgba(16,185,129,0.08)",
        padding: "24px",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
      <h3 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Journey Complete</h3>
      <p style={{ marginTop: 8, color: "var(--text-secondary)" }}>
        Score: <strong style={{ color: "var(--correct)" }}>{totalScore}/6</strong>
      </p>
      <div style={{ marginTop: 16 }}>
        {lesson.keyTakeaways.map((takeaway, index) => (
          <div key={takeaway} style={{ marginBottom: 10, color: "var(--text-primary)", fontSize: 14 }}>
            <span style={{ color: "var(--gold-primary)", marginRight: 8 }}>{index + 1}.</span>
            {takeaway}
          </div>
        ))}
      </div>
    </section>
  );
}
