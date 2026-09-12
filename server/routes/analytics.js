import { Router } from 'express'
import { requireAuth, requireManager } from '../auth.js'
import { db } from '../db.js'
import { COMPETENCY_ORDER, labelFor } from '../../src/data/competencyFramework.js'

const r = Router()

r.get('/org', requireAuth, requireManager, (_req, res) => {
  const learners = db.prepare("SELECT id, name, department FROM users WHERE role = 'learner'").all()
  const profRows = db.prepare('SELECT user_id, competency, score FROM profile').all()
  const assessCounts = Object.fromEntries(
    db.prepare('SELECT user_id, COUNT(*) c FROM assessments GROUP BY user_id').all().map((x) => [x.user_id, x.c]),
  )

  const byUser = new Map()
  for (const p of profRows) {
    if (!byUser.has(p.user_id)) byUser.set(p.user_id, {})
    byUser.get(p.user_id)[p.competency] = p.score
  }

  const enriched = learners
    .filter((l) => byUser.has(l.id))
    .map((l) => {
      const prof = byUser.get(l.id)
      const vals = Object.values(prof)
      const overall = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      const weakest = Object.entries(prof).sort((a, b) => a[1] - b[1])[0]
      const assessments = assessCounts[l.id] || 0
      return {
        id: l.id,
        name: l.name,
        department: l.department || 'Unassigned',
        overall,
        prof,
        weakest: { id: weakest[0], label: labelFor(weakest[0]), value: weakest[1] },
        assessments,
        trainingCompletion: Math.max(20, Math.min(100, Math.round(35 + assessments * 16))),
      }
    })

  const count = enriched.length || 1
  const avgOverall = Math.round(enriched.reduce((s, l) => s + l.overall, 0) / count)
  const avgCompletion = Math.round(enriched.reduce((s, l) => s + l.trainingCompletion, 0) / count)

  const topics = COMPETENCY_ORDER.map((id) => {
    const scores = enriched.map((l) => l.prof[id]).filter((v) => v != null)
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const gapPct = scores.length ? Math.round((scores.filter((v) => v < 50).length / scores.length) * 100) : 0
    return { id, label: labelFor(id), avg, gapPct }
  })

  const deptMap = {}
  enriched.forEach((l) => (deptMap[l.department] ||= []).push(l.overall))
  const departments = Object.entries(deptMap)
    .map(([department, arr]) => ({
      department,
      n: arr.length,
      avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    }))
    .sort((a, b) => b.avg - a.avg)

  const roster = [...enriched].sort((a, b) => a.overall - b.overall).slice(0, 12).map((l) => ({
    id: l.id,
    name: l.name,
    department: l.department,
    overall: l.overall,
    weakest: l.weakest,
    assessments: l.assessments,
    trainingCompletion: l.trainingCompletion,
  }))

  res.json({
    learnerCount: enriched.length,
    avgOverall,
    avgCompletion,
    atRiskTopics: topics.filter((t) => t.avg < 62).length,
    topics,
    departments,
    roster,
  })
})

export default r
