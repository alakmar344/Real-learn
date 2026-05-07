// types/index.ts
// Only types actually used by the active codebase.

// ─── Primitives ───────────────────────────────────────────────────────────────

export type Language =
  | "English"
  | "Hindi"
  | "Gujarati"
  | "Tamil"
  | "Bengali"
  | "Marathi"
  | "Telugu"
  | "Kannada";

export type Level = "Class 6-8" | "Class 9-10" | "College / Advanced";

export type Subject =
  | "Physics"
  | "Chemistry"
  | "Economics"
  | "Biology"
  | "CS"
  | "History"
  | "Geography"
  | "Mathematics"
  | "Political Science"
  | "Environmental Science"
  | "General";

// ─── Quiz ─────────────────────────────────────────────────────────────────────

/** A single MCQ question embedded inside a lesson part. */
export interface QuizQuestion {
  question: string;
  options: string[];       // always 4 items
  correctIndex: number;    // 0-3
  explanation: string;
}

// ─── Lesson Journey ───────────────────────────────────────────────────────────

/** One of the 3 unlockable parts in a lesson. */
export interface LessonPart {
  partNumber: 1 | 2 | 3;
  title: string;
  subject: Subject;
  content: string;         // markdown
  sources: string[];       // real URLs
  quiz: QuizQuestion[];    // always 2 questions
}

/**
 * The complete lesson returned by /api/generate-lesson.
 * Three sequential parts the student must unlock in order.
 */
export interface LessonJourney {
  question: string;
  language: Language;
  level: Level;
  parts: [LessonPart, LessonPart, LessonPart];
  keyTakeaways: [string, string, string];
}
export type ChatSegment =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "quiz";
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };
