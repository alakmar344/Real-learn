// types/index.ts
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

/**
 * How the AI answers:
 * - "fast": one direct answer part, generated very quickly (ChatGPT-style).
 * - "explain": the classic deep 3-part learning journey.
 */
export type LessonMode = "fast" | "explain";


type Subject =
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

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonPart {
  partNumber: number;
  title: string;
  subject: Subject;
  content: string;
  sources: string[];
  quiz: QuizQuestion[];
}

export interface LessonJourney {
  question?: string;
  topic?: string;
  language: Language;
  level: Level;
  /** "fast" journeys have 1 part; "explain" journeys have 3. */
  mode?: LessonMode;
  parts: LessonPart[];
  keyTakeaways: string[];
}

export type Theme = "light" | "dark" | "twilight";

export interface SavedJourney {
  id: string;
  question: string;
  language: Language;
  level: Level;
  lesson: LessonJourney;
  partScores: Record<number, number | null>;
  totalScore: number;
  savedAt: number;
  unlockedPart: number;
  completedParts: number[];
}
