# NEXORA — From Learning Material to Measurable Competency

**Team Quest Coders** · Smart India Hackathon 2026 · Problem Statement **SIH26101**

An AI-enabled learning platform for India's Official Statistical System. It identifies
competency gaps, generates quizzes/MCQs from uploaded learning material, and recommends
personalized training. **NEXORA does not replace iGOT Karmayogi** — it is designed as an
AI-powered competency-assessment and learning-intelligence layer that complements it.

Full-stack, working prototype: **React + Vite** frontend, **Node + Express** backend on
**libSQL** (SQLite-compatible — a local file in dev, a hosted Turso database in
production), real accounts (JWT + bcrypt), server-side Gemini AI with an offline
fallback, and deterministic (non-AI) scoring. Runs as a single Express server (Render/any
Node host) **or** as Vercel serverless functions from the same codebase — see
[Deployment](#deployment).

## Run it

```bash
npm install
cp .env.example .env        # then edit JWT_SECRET (any long random string)
npm run dev:all             # starts the API (:3001) and the web app (:5173) together
```

Open http://localhost:5173

- `npm run dev` — web app only (Vite, proxies `/api` to :3001)
- `npm run server` — API only (`node --watch server/index.js`)
- `npm run build && npm start` — production: Express serves the built `dist/` on one port
  (this is the exact shape deployed to Render — see [Deployment](#deployment))

### Demo accounts (seeded automatically on first run)

| Role | Email | Password | Notes |
|---|---|---|---|
| Learner | `learner@nexora.gov.in` | `demo1234` | "Arun Kumar", Statistical Training — has assessment history already |
| Training Manager | `manager@nexora.gov.in` | `demo1234` | Organization-wide competency analytics |
| Admin | `admin@nexora.gov.in` | `demo1234` | System stats: users, departments, materials, assessments |

The sign-in screen has one-click buttons that prefill these. A 30-learner demo cohort is
also seeded so the Manager and Admin dashboards have real data to show. Admin accounts
can't be self-registered — only `learner` and `manager` are offered on the sign-up form.

## Optional: enable live AI (Google Gemini, free)

The platform works fully **without** a key using a bundled, pre-analyzed offline sample
(topic map + a 20-question bank). To generate topics + MCQs live from any uploaded PDF:

1. Get a free key: https://aistudio.google.com/app/apikey
2. Put it in `.env` as `GEMINI_API_KEY=...` (server-side only — **never sent to the browser**)
3. Restart the server

The navbar shows **Live AI** or **Offline demo**. If Gemini ever returns malformed JSON,
the server retries once, then falls back to the offline sample — a bad AI response never
crashes a request.

## The working pipeline (all real, nothing mocked on this path)

```
Login (JWT)
  -> Upload PDF -> POST /api/materials/upload (multer: type + size validated)
  -> extract text (pdf.js, in the browser)
  -> POST /api/ai/analyze     -> AI topic map (persisted against the material)
  -> POST /api/ai/generate-questions -> AI MCQs (persisted against the material)
  -> interactive quiz
  -> POST /api/assessments    -> server scores it (deterministic, not AI),
                                  updates the competency profile, persists to SQLite,
                                  snapshots the recommendations
  -> Results: topic-wise scores, explained competency gaps
  -> Learning Path: ordered plan + iGOT-style course recommendations
     (mark a course "in progress" / "completed" -> POST /api/learning-progress)
  -> Re-assessment -> profile updates, improvement shown on the dashboard
```

Only **topic extraction** and **MCQ generation** call the LLM. Scoring, competency-gap
detection, the "why" explanations, the learning path ordering, and the iGOT ranking are
all deterministic code — never decided by the AI — so every number is explainable and
reproducible.

## Roles

| Role | Can do |
|---|---|
| `learner` | Upload material, take assessments, see their own dashboard/results/learning path |
| `manager` | Everything a learner's org-wide view needs: `/manager` — live aggregates across every learner (avg competency, common gaps, department comparison, roster) |
| `admin` | System administration: `/admin` — users by role, departments, materials uploaded, questions generated, assessments taken |

## API

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/auth/register` | — | Create a `learner` or `manager` account |
| `POST /api/auth/login` | — | Returns a JWT + user |
| `GET /api/auth/me` | ✓ | Current user + whether live AI is on |
| `POST /api/materials/upload` | ✓ | Multipart PDF upload (validated: type + ≤10MB) |
| `GET /api/materials` | ✓ | Your uploads (managers/admins see everyone's) |
| `GET /api/materials/:id` | ✓ | One material + its AI topic map |
| `POST /api/ai/analyze` | ✓ | Text -> topic map (live Gemini or offline sample) |
| `POST /api/ai/generate-questions` | ✓ | Text -> MCQs (also persisted to `questions`) |
| `GET /api/ai/catalogue` | ✓ | The demo iGOT-style course catalogue |
| `POST /api/assessments` | ✓ | Score a completed quiz, persist, return the full result bundle |
| `GET /api/assessments/state` · `GET /api/dashboard` | ✓ | Everything the learner dashboard needs (equivalent endpoints) |
| `GET /api/analytics/org` | manager/admin | Organization-wide competency analytics |
| `GET /api/admin/stats` | admin | System-wide numbers |
| `GET /api/competencies` | — | The static 9-competency framework |
| `GET /api/recommendations` | ✓ | Latest persisted recommendation snapshot |
| `GET`/`POST /api/learning-progress` | ✓ | Track "recommended / in progress / completed" per course |

## Database (libSQL — SQLite-compatible)

Local dev / Render: a real SQLite file (`data/nexora.db`, git-ignored) — nothing to set up.
On Vercel, set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (see [Deployment](#deployment)) so
writes persist across serverless invocations; the query layer (`server/db.js`) is identical
either way.

| Table | Holds |
|---|---|
| `users` | accounts — email, bcrypt hash, name, `role`, department |
| `materials` | uploaded PDF metadata, extracted text, AI topic map, status (raw file bytes aren't stored — text extraction happens client-side and only the text is persisted) |
| `questions` | MCQs generated per material (audit trail, admin visibility) |
| `assessments` | every quiz attempt — full scored result as JSON, linked to a material |
| `profile` | each learner's rolling per-competency score (the source of the dashboard) |
| `recommendations` | snapshot of what was recommended after each assessment |
| `learning_progress` | learner-marked status per recommended course |

The 9-competency framework and the dependency graph between them are static config
(`src/data/competencyFramework.js`), not database rows — they define what every score is
measured against and don't change per-user.

## Project structure

| Path | Purpose |
|---|---|
| `server/index.js` | Express app, route mounting, serves `dist/` in production (Render/local) |
| `api/index.js` | Vercel serverless entrypoint — re-exports the same Express app |
| `server/db.js` | libSQL schema, migrations, query helpers, first-run seeding (async) |
| `server/auth.js` | JWT sign/verify, `requireAuth` / `requireRole` / `requireManager` / `requireAdmin` |
| `server/lib/gemini.js` | server-side Gemini + retry-then-offline-fallback |
| `server/routes/*.js` | `auth`, `ai`, `materials`, `assessments`, `analytics`, `admin`, `misc` (dashboard/competencies/recommendations/learning-progress) |
| `src/lib/api.js` | client fetch wrapper (JWT header) + multipart upload helper |
| `src/lib/gemini.js` | thin client → `/api/ai/*` and `/api/materials/upload` |
| `src/context/AppState.jsx` | auth + server-state store |
| `src/pages/Login.jsx` | sign-in / registration (learner/manager only) |
| `src/pages/AdminDashboard.jsx` | system stats (new) |
| `src/pages/ManagerDashboard.jsx` | organization competency analytics (renamed from the old "officer" dashboard) |
| `src/lib/scoring.js` · `learningPath.js` · `recommend.js` | shared deterministic logic (imported by the server — same code scores on both sides) |
| `src/data/competencyFramework.js` · `sampleAnalysis.js` · `igotCatalogue.js` · `seedCohort.js` | framework, offline sample, demo catalogue, cohort generator |

Delete `data/nexora.db*` and `data/uploads/*` to wipe and re-seed from scratch.

## iGOT Karmayogi note

Recommendations come from a **demo catalogue** modelled on iGOT Karmayogi, clearly labelled
as such in the UI. `src/lib/recommend.js` + `getCatalogue()` (in `src/data/igotCatalogue.js`)
is the single integration point — swap it for a live iGOT API call and the ranking logic is
unchanged. **No live government API access or real pilot is claimed anywhere.**

## Deployment

The same codebase deploys two ways. Both serve the built React app and the API from the
same origin, so there's no CORS setup either way.

### Vercel (serverless)

1. Push this repo to GitHub, then import it on Vercel (framework preset: leave as
   detected/"Other" — `vercel.json` already sets the build command and rewrites).
2. In **Project Settings → Environment Variables**, set:
   - `JWT_SECRET` — required. The server **refuses to start without it** on Vercel (no
     insecure fallback in production).
   - `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — required for real persistence (accounts,
     uploads, assessments survive across requests). Free database at https://turso.tech.
     Without these, the app still deploys and the seeded demo accounts still work, but
     writes only last for the current serverless instance (`GET /api/health` reports
     `ephemeralDb: true` in that case).
   - `GEMINI_API_KEY` — optional, for live AI (leave blank for offline mode).
3. Deploy. `api/index.js` wraps the same Express app used locally/on Render — every route
   is unchanged; only the transport differs.

### Render / any long-running Node host

1. Push this repo to GitHub.
2. On Render: **New +** → **Blueprint** → pick the repo. `render.yaml` pre-fills the build
   command (`npm install && npm run build`), start command (`npm start`), and a generated
   `JWT_SECRET`.
3. Optionally set `GEMINI_API_KEY` for live AI, and `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`
   if you want the same hosted database as a Vercel deployment — otherwise Render uses a
   local SQLite file on its persistent disk, same as local dev.
4. Deploy → you get a public URL like `https://nexora-xxxx.onrender.com`.

**Env vars:** `JWT_SECRET` (required everywhere), `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
(required on Vercel for persistence, optional/unneeded on Render), `GEMINI_API_KEY`
(optional, either host), `PORT` (set by the host, ignored on Vercel).

## Roadmap

- Live iGOT Karmayogi API integration (behind the one boundary noted above)
- Adaptive assessment (difficulty adjusts to answers)
- Pre- vs post-training comparison report
- AI study-coach chat grounded in the learner's gap report
- DOCX / PPTX upload
- Flutter/Android build for field use
