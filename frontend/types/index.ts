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
  partNumber: 1 | 2 | 3;
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
  parts: [LessonPart, LessonPart, LessonPart];
  keyTakeaways: [string, string, string];
}

export type Theme = "light" | "dark";

export interface SavedJourney {
  id: string;
  question: string;
  language: Language;
  level: Level;
  lesson: LessonJourney;
  partScores: Record<1 | 2 | 3, number | null>;
  totalScore: number;
  savedAt: number;
  unlockedPart: 1 | 2 | 3;
  completedParts: number[];
}
