import jwt from 'jsonwebtoken'
import { getUserById, publicUser } from './db.js'

const SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me'
const EXPIRES = '7d'

export function signToken(user) {
  return jwt.sign({ uid: user.id, role: user.role }, SECRET, { expiresIn: EXPIRES })
}

export function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const { uid } = jwt.verify(token, SECRET)
    const user = getUserById(uid)
    if (!user) return res.status(401).json({ error: 'Account not found' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }
}

// Roles: 'learner' (the officer/trainee taking assessments), 'manager'
// (training manager — organization analytics), 'admin' (system administrator).
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` })
    }
    next()
  }
}

export const requireManager = requireRole('manager', 'admin')
export const requireAdmin = requireRole('admin')

export { publicUser }
