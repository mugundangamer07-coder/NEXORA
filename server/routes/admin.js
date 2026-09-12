import { Router } from 'express'
import { requireAuth, requireAdmin } from '../auth.js'
import { getAdminStats } from '../db.js'

const r = Router()
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// GET /api/admin/stats — system-wide numbers for the Admin dashboard:
// users by role, departments, materials, questions, assessments, recent activity.
r.get(
  '/stats',
  requireAuth,
  requireAdmin,
  wrap(async (_req, res) => res.json(getAdminStats())),
)

export default r
