# NEXORA — AI-Powered Learning Intelligence Platform

Prototype for the Smart India Hackathon problem statement (SIH26101): an AI learning platform
that identifies competency gaps, generates quizzes/MCQs from uploaded material, and
recommends personalized training aligned with the iGOT Karmayogi ecosystem, for
India's Official Statistical System.

It now has a **real backend** — Node + Express + SQLite — with accounts, JWT auth,
server-side scoring & persistence, live organization analytics, and a server-side AI
layer (the Gemini key never touches the browser).

## Run it

```bash
cd D:\Project\saksham
npm install
copy .env.example .env      # then edit JWT_SECRET (any long random string)
npm run dev:all             # starts the API (:3001) and the web app (:5173) together
```

Open http://localhost:5173

- `npm run dev` — web app only (Vite, proxies `/api` to :3001)
- `npm run server` — API only (`node --watch server/index.js`)
- `npm run build && npm run start` — production: Express serves the built `dist/`

### Demo accounts (seeded automatically on first run)

| Role | Email | Password |
|---|---|---|
| Learner | `learner@nexora.gov.in` | `demo1234` |
| Training Officer | `officer@nexora.gov.in` | `demo1234` |

The login screen has one-click buttons that prefill these. A 30-learner demo cohort
is also seeded so the officer dashboard has data.

## Optional: enable live AI (Google Gemini, free)

The platform works fully **without** a key using a bundled pre-analyzed sample.
To generate topics + MCQs live from any uploaded PDF:

1. Get a free key: https://aistudio.google.com/app/apikey
2. Put it in `.env` as `GEMINI_API_KEY=...` (server-side — never sent to the browser)
3. Restart the server

The navbar shows **Live AI** or **Offline demo**.

## The working pipeline (all real)

```
Upload PDF  ->  extract text (pdfjs, browser)  ->  POST /api/ai/analyze  ->  topic map
   ->  POST /api/ai/quiz  ->  interactive quiz  ->  POST /api/assessments
   ->  server scores it, updates the competency profile, persists to SQLite
   ->  returns result + profile + learning path + iGOT recommendations
```

Only *topic extraction* and *MCQ generation* use the LLM. Scoring, gap detection,
the "why" explanations, the learning path and the iGOT ranking are deterministic and
run on the server.

## Project structure

| Path | Purpose |
|---|---|
| `server/index.js` | Express app, route mounting, serves `dist/` in production |
| `server/db.js` | `node:sqlite` schema, query helpers, first-run seeding |
| `server/auth.js` | JWT sign/verify, `requireAuth` / `requireOfficer` middleware |
| `server/lib/gemini.js` | server-side Gemini + offline fallback |
| `server/routes/auth.js` | `POST /register`, `POST /login`, `GET /me` |
| `server/routes/ai.js` | `POST /analyze`, `POST /quiz`, `GET /catalogue` |
| `server/routes/assessments.js` | `GET /state`, `POST /` (score + persist) |
| `server/routes/analytics.js` | `GET /org` (officer only) — live cohort aggregates |
| `src/lib/api.js` | client fetch wrapper (JWT header, `/api` base) |
| `src/lib/gemini.js` | thin client → `/api/ai/*` |
| `src/context/AppState.jsx` | auth + server-state store (`login`, `register`, `logout`, `submitAssessment`) |
| `src/pages/Login.jsx` | sign-in / registration |
| `src/lib/scoring.js` · `learningPath.js` · `recommend.js` | shared deterministic logic (imported by the server) |
| `src/data/competencyFramework.js` · `sampleAnalysis.js` · `igotCatalogue.js` · `seedCohort.js` | framework, offline sample, demo catalogue, cohort generator |

Data lives in `data/nexora.db` (SQLite, git-ignored). Delete it to re-seed.

## iGOT Karmayogi note

Recommendations come from a **demo catalogue** modelled on iGOT Karmayogi.
`src/lib/recommend.js` / `getCatalogue()` (in `src/data/igotCatalogue.js`) is the single
integration point — swap it for a live iGOT API call and the ranking is unchanged.
No fake "live government API" is claimed anywhere in the UI.

## Roadmap

- Live iGOT Karmayogi API integration
- Adaptive assessment (difficulty adjusts to answers)
- Pre- vs post-training comparison report
- AI study-coach chat grounded in the learner's gap report
- DOCX / PPTX upload
- Flutter/Android build for field use
