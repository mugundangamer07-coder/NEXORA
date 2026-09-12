import { Router } from 'express'
import { requireAuth } from '../auth.js'
import {
  getProfile,
  upsertProfile,
  getHistory,
  insertAssessment,
  latestResult,
  saveRecommendationSnapshot,
} from '../db.js'
import { scoreQuiz, mergeProfile } from '../../src/lib/scoring.js'
import { buildLearningPath } from '../../src/lib/learningPath.js'
import { recommendTraining } from '../../src/lib/recommend.js'

const r = Router()
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const isFullResult = (x) => x && Array.isArray(x.perTopic) && Array.isArray(x.gaps) && x.perTopic.length > 0

export async function buildDashboardBundle(userId, result, profile) {
  const usable = isFullResult(result) ? result : null
  const learningPath = usable ? buildLearningPath(usable, profile) : null
  const recommendations = usable ? await recommendTraining(usable, profile) : null
  return { result: usable, profile, learningPath, recommendations, history: getHistory(userId) }
}

// Everything the learner dashboard / results / path pages need, from the server.
r.get(
  '/state',
  requireAuth,
  wrap(async (req, res) => {
    const profile = getProfile(req.user.id)
    const result = latestResult(req.user.id)
    res.json(await buildDashboardBundle(req.user.id, result, profile))
  }),
)

// body: { documentName, source, questions:[...], answers:{id:idx}, materialId? }
r.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const { documentName, source, questions, answers, materialId } = req.body || {}
    if (!Array.isArray(questions) || !questions.length || typeof answers !== 'object' || !answers) {
      return res.status(400).json({ error: 'questions and answers are required' })
    }
    const result = scoreQuiz(questions, answers) // authoritative scoring, server-side — never AI-decided
    const prev = getProfile(req.user.id)
    const profile = mergeProfile(prev, result)

    const assessmentId = insertAssessment(req.user.id, {
      documentName,
      source,
      result,
      materialId: materialId ? Number(materialId) : null,
    })
    upsertProfile(req.user.id, profile)

    const bundle = await buildDashboardBundle(req.user.id, result, profile)
    saveRecommendationSnapshot(req.user.id, assessmentId, bundle.recommendations)
    res.json({ ...bundle, assessmentId })
  }),
)

export default r
