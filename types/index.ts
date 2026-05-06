export interface Story {
  id: string;
  headline: string;
  summary: string;
  category: string;
  region: string;
  imagePrompt: string;
  sourceUrl: string;
  date: string;
}

export interface Concept {
  id: string;
  name: string;
  subject: string;
  difficulty: "Easy" | "Medium" | "Hard";
  teaser: string;
}

export interface Lesson {
  lesson: string;
  keyTakeaway: string;
  sources: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}

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
  | "Environmental Science";

export interface AppState {
  language: Language;
  level: Level;
  stories: Story[];
  selectedStory: Story | null;
  concepts: Concept[];
  selectedConcept: Concept | null;
  lesson: Lesson | null;
  quiz: Quiz | null;
}
