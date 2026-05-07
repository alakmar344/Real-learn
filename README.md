# RealLearn split deployment

This repository is now split into two deployable parts:

- `frontend/` → Next.js app (deploy to **Vercel**)
- `backend/` → Express API service (deploy to **Render**)

## Frontend (Vercel)

1. Set project root to `frontend`
2. Add env variable:
   - `NEXT_PUBLIC_BACKEND_URL=https://<your-render-backend>.onrender.com`
3. Build command: `npm run build`

## Backend (Render)

1. Set root directory to `backend`
2. Build command: `npm install`
3. Start command: `npm start`
4. Add env variables:
   - `GEMMA_API_KEY=...`
   - `FRONTEND_ORIGIN=https://<your-vercel-frontend>.vercel.app`
   - `PORT=10000` (optional on Render)

## Keep-alive behavior

The backend `/api/generate-lesson` endpoint now streams Server-Sent Events and sends heartbeat `ping` events every 15 seconds while Gemma is generating. This keeps the connection alive for long-running requests, and closes only after sending either:

- `lesson` + `done`, or
- `error`

## Local development

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
