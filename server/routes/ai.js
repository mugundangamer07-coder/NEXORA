import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { analyzeDocument, generateQuiz, hasLiveAI } from '../lib/gemini.js'
import { getCatalogue } from '../../src/data/igotCatalogue.js'

const r = Router()
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

r.get('/status', (_req, res) => res.json({ liveAI: hasLiveAI() }))

// body: { text, documentName }
r.post(
  '/analyze',
  requireAuth,
  wrap(async (req, res) => {
    const { text, documentName } = req.body || {}
    res.json(await analyzeDocument(String(text || ''), documentName))
  }),
)

// body: { text, count, topicIds }
r.post(
  '/quiz',
  requireAuth,
  wrap(async (req, res) => {
    const { text, count, topicIds } = req.body || {}
    const n = [5, 10, 20].includes(Number(count)) ? Number(count) : 10
    res.json(await generateQuiz(String(text || ''), n, Array.isArray(topicIds) ? topicIds : []))
  }),
)

r.get(
  '/catalogue',
  requireAuth,
  wrap(async (_req, res) => res.json(await getCatalogue())),
)

export default r
