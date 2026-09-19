import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

import { ensureReady, isEphemeral } from './db.js'
import { configError } from './auth.js'
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'
import assessmentRoutes from './routes/assessments.js'
import analyticsRoutes from './routes/analytics.js'
import materialsRoutes from './routes/materials.js'
import adminRoutes from './routes/admin.js'
import miscRoutes from './routes/misc.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// The API never runs on the Vite dev port (5173). Some launchers inject PORT=5173
// for the web preview; ignore that here so the API and the frontend don't collide.
const PORT = process.env.PORT && process.env.PORT !== '5173' ? process.env.PORT : 3001

// A failed database init is the one server fault a demo operator has to fix
// themselves, so it says what broke instead of the generic "Server error".
function dbErrorMessage(err) {
  const detail = String(err?.message || err || 'unknown error')
  return isEphemeral
    ? `Database unavailable: ${detail}. No TURSO_DATABASE_URL is set, so the app fell back to temporary storage.`
    : `Database unavailable: ${detail}`
}

const app = express()
// Both Vercel and Render sit in front of the app as a reverse proxy — without
// this, req.ip is the proxy's own address (wrong for rate limiting) and
// express-rate-limit logs a validation warning on every single request.
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// With the server misconfigured, no API route may run (auth.js has no signing
// secret) — every request, health included, gets the reason instead.
app.use('/api', (_req, res, next) => (configError ? res.status(503).json({ ok: false, error: configError }) : next()))

// Answered before the database gate below, so it still responds when the DB is
// down — that's the case you most need a health check for.
app.get('/api/health', (_req, res) => {
  ensureReady().then(
    () => res.json({ ok: true, ephemeralDb: isEphemeral }),
    (err) => res.status(503).json({ ok: false, ephemeralDb: isEphemeral, error: dbErrorMessage(err) }),
  )
})

// Schema creation + first-run seeding happen lazily on first request instead
// of at module load — required on serverless (a cold start can't block at
// import time the way a long-lived process could), and harmless everywhere
// else since ensureReady() is memoized after its first call.
app.use((req, res, next) => {
  // next() must be called with no argument: Express reads any truthy first
  // argument as an error, so `.then(next, next)` would break on a resolved value.
  ensureReady().then(
    () => next(),
    (err) => {
      console.error('[nexora] database init failed:', err)
      res.status(503).json({ error: dbErrorMessage(err) })
    },
  )
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
})
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Try again in a few minutes.' },
})

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/ai', aiLimiter, aiRoutes)
app.use('/api/assessments', assessmentRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/materials', materialsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', miscRoutes) // /api/competencies, /api/dashboard, /api/recommendations, /api/learning-progress

// Serve the built frontend in production (npm run build -> dist/). On Vercel
// the static frontend is served by the platform itself (see vercel.json), so
// this only matters for the single-process deployment shape (Render, `npm start`).
if (!process.env.VERCEL) {
  const dist = join(__dirname, '..', 'dist')
  if (existsSync(dist)) {
    app.use(express.static(dist))
    app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
  }
}

app.use((err, _req, res, _next) => {
  console.error('[nexora] request error:', err?.message || err)
  res.status(500).json({ error: 'Server error' })
})

process.on('unhandledRejection', (e) => console.error('[nexora] unhandledRejection:', e))
process.on('uncaughtException', (e) => console.error('[nexora] uncaughtException:', e))

// Vercel imports this module for its request/response contract and never
// calls listen() itself — starting a listener there would be a no-op at best.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`[nexora] API on http://localhost:${PORT}`))
}

export default app
