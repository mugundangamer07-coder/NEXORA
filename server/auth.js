import jwt from 'jsonwebtoken'
import { getUserById, publicUser } from './db.js'

// On a real deployment (Vercel or NODE_ENV=production), a missing JWT_SECRET
// must never fall back to the public default below — that would let anyone
// forge a token for any user, including admin. Instead of crashing at import
// (which Vercel reports only as an opaque FUNCTION_INVOCATION_FAILED), the
// server starts and index.js answers every API request with this message.
const IS_DEPLOYED = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production'
export const configError =
  !process.env.JWT_SECRET && IS_DEPLOYED
    ? 'Server misconfigured: JWT_SECRET is not set. Add it in your Vercel/host environment variables, then redeploy.'
    : null
if (configError) console.error(`[nexora] ${configError}`)
else if (!process.env.JWT_SECRET) {
  console.warn('[nexora] JWT_SECRET not set — using an insecure development-only default. Set it in .env.')
}
const SECRET = process.env.JWT_SECRET || (configError ? undefined : 'dev-only-insecure-secret-change-me')
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
