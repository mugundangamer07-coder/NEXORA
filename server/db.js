import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { buildCohort } from '../src/data/seedCohort.js'
import { COMPETENCY_ORDER } from '../src/data/competencyFramework.js'
import { SAMPLE_QUESTION_BANK, SAMPLE_DOCUMENT } from '../src/data/sampleAnalysis.js'
import { scoreQuiz, mergeProfile } from '../src/lib/scoring.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.NEXORA_DB || join(__dirname, '..', 'data', 'nexora.db')
mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')

// node:sqlite has no .transaction() helper — provide a small nest-safe one.
let _inTx = false
export function tx(fn) {
  if (_inTx) return fn()
  _inTx = true
  db.exec('BEGIN')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  } finally {
    _inTx = false
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'learner',   -- 'learner' | 'officer'
  department    TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_name   TEXT,
  overall         INTEGER NOT NULL,
  correct_count   INTEGER,
  total_questions INTEGER,
  source          TEXT,
  result_json     TEXT NOT NULL,
  taken_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id, taken_at);

CREATE TABLE IF NOT EXISTS profile (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency TEXT NOT NULL,
  score      INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, competency)
);
`)

/* --------------------------------------------------------------- helpers */

export function createUser({ email, password, name, role = 'learner', department = null }) {
  const hash = bcrypt.hashSync(password, 10)
  const info = db
    .prepare('INSERT INTO users (email, password_hash, name, role, department, created_at) VALUES (?,?,?,?,?,?)')
    .run(email.toLowerCase().trim(), hash, name.trim(), role, department, new Date().toISOString())
  return getUserById(info.lastInsertRowid)
}
export const getUserByEmail = (email) =>
  db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim())
export const getUserById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)

export function publicUser(u) {
  if (!u) return null
  return { id: u.id, email: u.email, name: u.name, role: u.role, department: u.department }
}

export function getProfile(userId) {
  const rows = db.prepare('SELECT competency, score FROM profile WHERE user_id = ?').all(userId)
  return Object.fromEntries(rows.map((r) => [r.competency, r.score]))
}

export function upsertProfile(userId, profileObj) {
  const now = new Date().toISOString()
  const stmt = db.prepare(
    `INSERT INTO profile (user_id, competency, score, updated_at) VALUES (?,?,?,?)
     ON CONFLICT(user_id, competency) DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at`,
  )
  tx(() => {
    for (const [competency, score] of Object.entries(profileObj)) {
      stmt.run(userId, competency, Math.round(score), now)
    }
  })
}

export function getHistory(userId, limit = 25) {
  return db
    .prepare(
      `SELECT id, document_name, overall, correct_count, total_questions, source, taken_at
       FROM assessments WHERE user_id = ? ORDER BY taken_at ASC LIMIT ?`,
    )
    .all(userId, limit)
    .map((r) => ({
      id: r.id,
      documentName: r.document_name,
      overall: r.overall,
      correctCount: r.correct_count,
      totalQuestions: r.total_questions,
      source: r.source,
      takenAt: r.taken_at,
    }))
}

export function insertAssessment(userId, { documentName, source, result }) {
  const info = db
    .prepare(
      `INSERT INTO assessments
       (user_id, document_name, overall, correct_count, total_questions, source, result_json, taken_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    .run(
      userId,
      documentName || null,
      result.overall,
      result.correctCount ?? null,
      result.totalQuestions ?? null,
      source || null,
      JSON.stringify(result),
      result.takenAt || new Date().toISOString(),
    )
  return info.lastInsertRowid
}

export function latestResult(userId) {
  const row = db
    .prepare('SELECT result_json FROM assessments WHERE user_id = ? ORDER BY taken_at DESC LIMIT 1')
    .get(userId)
  return row ? JSON.parse(row.result_json) : null
}

/* --------------------------------------------------------------- seeding */

const DEPARTMENTS = [
  'National Sample Survey Office',
  'Economic Statistics Division',
  'Social Statistics Division',
  'Price Statistics Division',
  'State Directorate of Economics & Statistics',
]

export function seedIfEmpty() {
  const n = db.prepare('SELECT COUNT(*) c FROM users').get().c
  if (n > 0) return

  const now = new Date().toISOString()

  // 1 officer + 1 primary learner + a demo cohort of learners with realistic profiles
  createUser({
    email: 'officer@nexora.gov.in',
    password: 'demo1234',
    name: 'Nodal Officer',
    role: 'officer',
    department: 'National Sample Survey Office',
  })

  const primary = createUser({
    email: 'learner@nexora.gov.in',
    password: 'demo1234',
    name: 'Priya Sharma',
    role: 'learner',
    department: 'State Directorate of Economics & Statistics',
  })

  const insAssess = db.prepare(
    `INSERT INTO assessments (user_id, document_name, overall, correct_count, total_questions, source, result_json, taken_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  )
  // two earlier attempts for the progress sparkline (thin rows are fine — only the columns are read)
  insAssess.run(primary.id, SAMPLE_DOCUMENT.name, 41, 4, 10, 'offline', JSON.stringify({ overall: 41 }), '2026-09-05T09:10:00Z')
  insAssess.run(primary.id, SAMPLE_DOCUMENT.name, 55, 6, 10, 'offline', JSON.stringify({ overall: 55 }), '2026-09-06T10:30:00Z')

  // a real latest result computed by the actual scoring engine (~70%, mixed bands)
  const qs = SAMPLE_QUESTION_BANK.slice(0, 10)
  const ans = {}
  qs.forEach((q, i) => (ans[q.id] = i % 10 < 7 ? q.answer : (q.answer + 1) % 4))
  const priyaResult = scoreQuiz(qs, ans)
  priyaResult.takenAt = '2026-09-07T14:00:00Z'
  insAssess.run(
    primary.id,
    SAMPLE_DOCUMENT.name,
    priyaResult.overall,
    priyaResult.correctCount,
    priyaResult.totalQuestions,
    'offline',
    JSON.stringify(priyaResult),
    priyaResult.takenAt,
  )
  upsertProfile(primary.id, mergeProfile({ 'basic-stats': 84, probability: 58, regression: 55, visualization: 70 }, priyaResult))

  // cohort — reuse the deterministic generator the frontend used
  const cohort = buildCohort(30)
  const insUser = db.prepare(
    'INSERT INTO users (email, password_hash, name, role, department, created_at) VALUES (?,?,?,?,?,?)',
  )
  const hash = bcrypt.hashSync('demo1234', 8)
  tx(() => {
    cohort.forEach((l, i) => {
      const dept = DEPARTMENTS[i % DEPARTMENTS.length]
      const info = insUser.run(`l${String(i + 1).padStart(2, '0')}@nexora.demo`, hash, l.name, 'learner', dept, now)
      const uid = info.lastInsertRowid
      const prof = {}
      COMPETENCY_ORDER.forEach((id) => {
        if (l.topics[id] != null) prof[id] = l.topics[id]
      })
      upsertProfile(uid, prof)
      for (let a = 0; a < l.assessments; a++) {
        const ov = Math.max(20, Math.min(95, l.overall + (a - l.assessments / 2) * 6 + Math.round((Math.random() - 0.5) * 8)))
        db.prepare(
          `INSERT INTO assessments (user_id, document_name, overall, correct_count, total_questions, source, result_json, taken_at)
           VALUES (?,?,?,?,?,?,?,?)`,
        ).run(uid, 'Assessment', Math.round(ov), Math.round(ov / 10), 10, 'offline', JSON.stringify({ overall: Math.round(ov) }), now)
      }
    })
  })
  console.log(`[db] seeded ${db.prepare('SELECT COUNT(*) c FROM users').get().c} users`)
}
