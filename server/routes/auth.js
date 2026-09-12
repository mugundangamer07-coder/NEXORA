import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { createUser, getUserByEmail, publicUser } from '../db.js'
import { signToken, requireAuth } from '../auth.js'
import { hasLiveAI } from '../lib/gemini.js'

const r = Router()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

r.post('/register', (req, res) => {
  let { email, password, name, role, department } = req.body || {}
  email = String(email || '').trim()
  name = String(name || '').trim()
  role = role === 'officer' ? 'officer' : 'learner'
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' })
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  if (name.length < 2) return res.status(400).json({ error: 'Enter your name' })
  if (getUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists' })
  const user = createUser({ email, password, name, role, department: department || null })
  res.json({ token: signToken(user), user: publicUser(user), liveAI: hasLiveAI() })
})

r.post('/login', (req, res) => {
  const { email, password } = req.body || {}
  const user = getUserByEmail(email || '')
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' })
  }
  res.json({ token: signToken(user), user: publicUser(user), liveAI: hasLiveAI() })
})

r.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), liveAI: hasLiveAI() })
})

export default r
