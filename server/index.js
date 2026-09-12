import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

import { seedIfEmpty } from './db.js'
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

seedIfEmpty()

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/assessments', assessmentRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/materials', materialsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', miscRoutes) // /api/competencies, /api/dashboard, /api/recommendations, /api/learning-progress

// Serve the built frontend in production (npm run build -> dist/)
const dist = join(__dirname, '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

app.use((err, _req, res, _next) => {
  console.error('[nexora] request error:', err?.message || err)
  res.status(500).json({ error: 'Server error' })
})

process.on('unhandledRejection', (e) => console.error('[nexora] unhandledRejection:', e))
process.on('uncaughtException', (e) => console.error('[nexora] uncaughtException:', e))

app.listen(PORT, () => console.log(`[nexora] API on http://localhost:${PORT}`))
