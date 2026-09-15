import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { COMPETENCIES } from '../../src/data/competencyFramework.js'
import { getProfile, latestResult, getLatestRecommendations, upsertLearningProgress, listLearningProgress } from '../db.js'
import { buildDashboardBundle } from './assessments.js'

const r = Router()
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// GET /api/competencies — the static framework the whole app scores against.
r.get('/competencies', (_req, res) => {
  res.json(COMPETENCIES)
})

// GET /api/dashboard — a single call with everything the learner dashboard needs.
// (kept alongside /api/assessments/state, which does the same thing, for API-shape
// parity with the spec — both are safe to use.)
r.get(
  '/dashboard',
  requireAuth,
  wrap(async (req, res) => {
    const profile = await getProfile(req.user.id)
    const result = await latestResult(req.user.id)
    res.json(await buildDashboardBundle(req.user.id, result, profile))
  }),
)

// GET /api/recommendations — the persisted snapshot from the most recent assessment.
r.get(
  '/recommendations',
  requireAuth,
  wrap(async (req, res) => {
    res.json(await getLatestRecommendations(req.user.id))
  }),
)

// GET/POST /api/learning-progress — mark a recommended course as started/completed,
// so the demo can show "recommended -> in progress -> completed" before a re-test.
r.get(
  '/learning-progress',
  requireAuth,
  wrap(async (req, res) => res.json(await listLearningProgress(req.user.id))),
)
r.post(
  '/learning-progress',
  requireAuth,
  wrap(async (req, res) => {
    const { competency, courseId, courseTitle, status } = req.body || {}
    if (!courseId || !courseTitle || !['recommended', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'competency, courseId, courseTitle and a valid status are required' })
    }
    await upsertLearningProgress(req.user.id, { competency: competency || 'general', courseId, courseTitle, status })
    res.json(await listLearningProgress(req.user.id))
  }),
)

export default r
