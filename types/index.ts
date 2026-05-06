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

// Chat feature types
export interface ChatSegment {
  type: "text" | "quiz";
  content?: string; // markdown text for text segments
  question?: QuizQuestion; // single question for quiz segments
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  /** "chat" = normal conversational reply; "lesson" = structured lesson with quiz checkpoints */
  type: "chat" | "lesson";
  content?: string; // for type === "chat"
  segments?: ChatSegment[]; // for type === "lesson"
  sources?: string[];
  timestamp: number;
}
