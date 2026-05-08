# RealLearn

RealLearn is an AI learning platform where students ask any question and get a structured, interactive learning journey in 3 parts.  
It is designed to make learning clear, engaging, and connected to the real world.

## Demo

🎥 https://youtu.be/055k6ipoPOU

## What RealLearn does

- Turns one question into a complete 3-part lesson journey
- Adapts explanation style to learner level:
  - Class 6–8
  - Class 9–10
  - College / Advanced
- Generates lessons in multiple Indian languages
- Requires understanding checks (quiz unlock flow) before moving deeper
- Ends with key takeaways and follow-up learning

## Core Features

1. **3-Part Unlock Learning Flow**
   - Part 1: Foundation (beginner friendly)
   - Part 2: Mechanism (how and why)
   - Part 3: Real world (current events and practical impact)

2. **Quiz-Gated Progress**
   - Every part includes 2 MCQs
   - Learner must score full marks to unlock the next part

3. **Real-World Context**
   - Backend fetches recent context (news) to ground Part 3 in current reality
   - Lessons include source links

4. **Live Lesson Generation via SSE**
   - Backend streams events using Server-Sent Events
   - Sends heartbeat `ping` events every 15 seconds to keep long requests alive
   - Stream ends with:
     - `lesson` + `done`, or
     - `error`

5. **Persistent Learning Journey State**
   - Selected language, level, and lesson journey state are persisted in session storage

6. **Follow-Up Learning**
   - After completion, learner can ask follow-up questions and start a fresh 3-part journey

## Problems RealLearn solves (real world)

- **Information overload:** Converts broad or confusing topics into a guided step-by-step journey
- **Low comprehension:** Forces active understanding through quizzes before progression
- **Theory without relevance:** Connects concepts with current real-world events
- **One-size-fits-all teaching:** Adapts content depth by class level and language choice
- **Passive learning:** Encourages active participation, recall, and iterative follow-up questions

## What it fixes for learners

- Reduces confusion when starting difficult topics from zero
- Improves retention through staged learning + quick assessments
- Makes advanced ideas more accessible in familiar language/context
- Bridges textbook concepts with real events happening now

## Tech Stack

### Frontend (Deployed on Vercel)
- Next.js 15 (App Router)
- React 19 + TypeScript
- Zustand (state management + persistence middleware)
- React Markdown + remark-gfm (rich lesson rendering)
- Tailwind CSS (configured) + custom styling

### Backend (Deployed on Render)
- Node.js + Express
- CORS + JSON API endpoints
- SSE (Server-Sent Events) streaming responses
- Gemma API integration (lesson generation)
- Serper API integration (real-world news context)
- JSON repair + schema validation for model output reliability

## Deployment Architecture

- `frontend/` → Next.js app → **Vercel**
- `backend/` → Express API service → **Render**
- Frontend calls backend endpoint:
  - `POST /api/generate-lesson`
- Health endpoint:
  - `GET /health`

## Environment Variables

### Frontend
- `NEXT_PUBLIC_BACKEND_URL=https://<your-render-backend>.onrender.com`

### Backend
- `GEMMA_API_KEY=...`
- `SERPER_API_KEY=...`
- `FRONTEND_ORIGIN=https://<your-vercel-frontend>.vercel.app`
- `PORT=10000` (optional on Render)

## Local Development

Open two terminals:

### 1) Backend
```bash
cd backend
npm install
npm start
```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend uses `NEXT_PUBLIC_BACKEND_URL` from `frontend/.env.local`.
