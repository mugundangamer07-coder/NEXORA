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

export function requireOfficer(req, res, next) {
  if (req.user?.role !== 'officer') return res.status(403).json({ error: 'Training-officer access only' })
  next()
}

export { publicUser }
