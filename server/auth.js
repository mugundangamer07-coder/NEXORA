import jwt from 'jsonwebtoken'
import { getUserById, publicUser } from './db.js'

// On a real deployment (Vercel or NODE_ENV=production), a missing JWT_SECRET
// must be a hard failure — silently falling back to a public, hardcoded
// secret would let anyone forge a valid token for any user, including admin.
if (!process.env.JWT_SECRET && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
  throw new Error('JWT_SECRET is required in production. Set it in your Vercel/host environment variables.')
}
if (!process.env.JWT_SECRET) {
  console.warn('[nexora] JWT_SECRET not set — using an insecure development-only default. Set it in .env.')
}
const SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me'
const EXPIRES = '7d'

export function signToken(user) {
  return jwt.sign({ uid: user.id, role: user.role }, SECRET, { expiresIn: EXPIRES })
}

export async function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const { uid } = jwt.verify(token, SECRET)
    const user = await getUserById(uid)
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
