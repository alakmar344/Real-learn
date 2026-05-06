# RealLearn — The World Is Your Textbook

> Real news. Real concepts. No textbooks.

**RealLearn** is an AI-powered learning platform that transforms today's global news events into interactive lessons. Every day, real things happen — rocket launches, economic crises, disease outbreaks, elections, tech breakthroughs. These events already contain every concept ever taught in school.

RealLearn fetches today's real news, extracts the hidden academic concepts buried inside each story, and teaches those concepts **through** the story — not separately from it.

Built for the [Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon) by Google DeepMind.

---

## Features

- 📰 **Daily News Feed** — 6 curated real-world stories across Science, Technology, Environment, Economics, Health, and Geopolitics
- 🧠 **AI Concept Extraction** — Gemma 4 identifies 3-5 hidden academic concepts in every story
- 📚 **Story-Anchored Lessons** — Learn physics, chemistry, economics, biology through actual news events
- 🌍 **Multilingual** — Lessons in English, Hindi, Gujarati, Tamil, Bengali, Marathi, Telugu, Kannada
- 🎯 **Adaptive Levels** — Class 6-8, Class 9-10, College / Advanced
- ✅ **Interactive Quizzes** — Test your understanding with story-referenced MCQs
- 🔍 **Google Search Grounding** — All lessons cite real, verifiable sources

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **AI Model**: Gemma 4 API (`gemma-4-26b-a4b-it`) via Google AI Studio
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Copy `.env.local.example` to `.env.local` and add your Gemma API key:
   ```
   GEMMA_API_KEY=your_key_here
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/fetch-stories` | GET | Fetches 6 of today's top news stories via Gemma 4 + Google Search |
| `/api/extract-concepts` | POST | Extracts academic concepts hidden in a news story |
| `/api/teach-concept` | POST | Generates a story-anchored lesson for a concept |
| `/api/quiz` | POST | Generates 3 MCQ questions based on the lesson |

## Project Structure

```
reallearn/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              (homepage / daily feed)
│   ├── globals.css
│   └── api/
│       ├── fetch-stories/route.ts
│       ├── extract-concepts/route.ts
│       ├── teach-concept/route.ts
│       └── quiz/route.ts
├── components/
│   ├── StoryCard.tsx
│   ├── ConceptBubble.tsx
│   ├── LessonPanel.tsx
│   ├── QuizBlock.tsx
│   ├── LanguageSelector.tsx
│   ├── LevelBadge.tsx
│   └── SourceTag.tsx
├── lib/
│   ├── gemma.ts              (Gemma 4 API client)
│   └── prompts.ts            (system prompts)
└── types/
    └── index.ts
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMMA_API_KEY` | Your Google AI Studio API key for Gemma 4 |

> ⚠️ Never commit your `.env.local` file. The API key must stay server-side only.

