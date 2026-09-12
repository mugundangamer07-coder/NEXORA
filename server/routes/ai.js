import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { analyzeDocument, generateQuiz, hasLiveAI } from '../lib/gemini.js'
import { getCatalogue } from '../../src/data/igotCatalogue.js'
import { getMaterialById, saveMaterialAnalysis, insertQuestions } from '../db.js'

const r = Router()
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

function ownedMaterialOr400(req, res) {
  const { materialId } = req.body || {}
  if (!materialId) return null
  const m = getMaterialById(Number(materialId))
  if (!m || m.user_id !== req.user.id) {
    res.status(404).json({ error: 'Material not found' })
    return undefined // signal "already responded"
  }
  return m
}

r.get('/status', (_req, res) => res.json({ liveAI: hasLiveAI() }))

// body: { text, documentName, materialId? }
// If materialId is given (from /api/materials/upload), the analysis is saved
// against that material row so it shows up for admins/managers too.
r.post(
  '/analyze',
  requireAuth,
  wrap(async (req, res) => {
    const material = ownedMaterialOr400(req, res)
    if (material === undefined) return
    const { text, documentName } = req.body || {}
    const map = await analyzeDocument(String(text || ''), documentName || material?.original_name)
    if (material) saveMaterialAnalysis(material.id, { extractedText: text, topicMap: map, aiSource: map.source })
    res.json(map)
  }),
)

// body: { text, count, topicIds, materialId? }
async function generateQuestionsHandler(req, res) {
  const material = ownedMaterialOr400(req, res)
  if (material === undefined) return
  const { text, count, topicIds } = req.body || {}
  const n = [5, 10, 20].includes(Number(count)) ? Number(count) : 10
  const out = await generateQuiz(String(text || ''), n, Array.isArray(topicIds) ? topicIds : [])
  if (material) insertQuestions(material.id, out.questions, out.source)
  res.json(out)
}
r.post('/generate-questions', requireAuth, wrap(generateQuestionsHandler))
r.post('/quiz', requireAuth, wrap(generateQuestionsHandler)) // back-compat alias

r.get(
  '/catalogue',
  requireAuth,
  wrap(async (_req, res) => res.json(await getCatalogue())),
)

export default r
