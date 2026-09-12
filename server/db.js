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

export const UPLOAD_DIR = process.env.NEXORA_UPLOADS || join(__dirname, '..', 'data', 'uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })

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
  role          TEXT NOT NULL DEFAULT 'learner',   -- 'learner' | 'manager' | 'admin'
  department    TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id     INTEGER REFERENCES materials(id) ON DELETE SET NULL,
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

-- An uploaded learning document. Raw bytes live on disk (UPLOAD_DIR);
-- this row is the record of it plus whatever the AI step has learned so far.
CREATE TABLE IF NOT EXISTS materials (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name   TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      INTEGER NOT NULL,
  extracted_text  TEXT,
  topics_json     TEXT,          -- the AI (or offline) topic map, once analyzed
  ai_source       TEXT,          -- 'live' | 'offline'
  status          TEXT NOT NULL DEFAULT 'uploaded',  -- uploaded | analyzed
  created_at      TEXT NOT NULL,
  analyzed_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id, created_at);

-- MCQs generated for a material — kept for the admin audit trail and so a
-- material's question bank can be inspected without re-calling the AI.
CREATE TABLE IF NOT EXISTS questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id   INTEGER REFERENCES materials(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL,
  subtopic      TEXT,
  difficulty    TEXT NOT NULL,
  question      TEXT NOT NULL,
  options_json  TEXT NOT NULL,   -- JSON array of 4 strings
  answer_index  INTEGER NOT NULL,
  explanation   TEXT,
  source        TEXT,            -- 'live' | 'offline'
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_material ON questions(material_id);

-- A snapshot of what was recommended after a given assessment, so managers/
-- admins can see recommendation history instead of only the live ranking.
CREATE TABLE IF NOT EXISTS recommendations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id  INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
  competency     TEXT NOT NULL,
  course_id      TEXT NOT NULL,
  course_title   TEXT NOT NULL,
  relevance      INTEGER,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id, created_at);

-- Learner-marked progress against a recommended resource — lets the demo
-- show "recommended -> in progress -> completed" before a re-assessment.
CREATE TABLE IF NOT EXISTS learning_progress (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency     TEXT NOT NULL,
  course_id      TEXT NOT NULL,
  course_title   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'recommended', -- recommended | in_progress | completed
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE(user_id, course_id)
);
`)

// ---- one-time, additive migrations for databases created before this schema ----
try {
  db.exec("UPDATE users SET role = 'manager' WHERE role = 'officer'")
} catch {}
try {
  db.exec('ALTER TABLE assessments ADD COLUMN material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL')
} catch {
  // column already exists on a database created by an earlier version of this file — fine.
}

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

export function insertAssessment(userId, { documentName, source, result, materialId = null }) {
  const info = db
    .prepare(
      `INSERT INTO assessments
       (user_id, material_id, document_name, overall, correct_count, total_questions, source, result_json, taken_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      userId,
      materialId,
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

/* --------------------------------------------------------------- materials */

export function insertMaterial(userId, { originalName, storedFilename, mimeType, sizeBytes }) {
  const info = db
    .prepare(
      `INSERT INTO materials (user_id, original_name, stored_filename, mime_type, size_bytes, status, created_at)
       VALUES (?,?,?,?,?,'uploaded',?)`,
    )
    .run(userId, originalName, storedFilename, mimeType, sizeBytes, new Date().toISOString())
  return getMaterialById(info.lastInsertRowid)
}

export const getMaterialById = (id) => db.prepare('SELECT * FROM materials WHERE id = ?').get(id)

export function saveMaterialAnalysis(materialId, { extractedText, topicMap, aiSource }) {
  db.prepare(
    `UPDATE materials SET extracted_text = ?, topics_json = ?, ai_source = ?, status = 'analyzed', analyzed_at = ?
     WHERE id = ?`,
  ).run(extractedText?.slice(0, 20000) || null, JSON.stringify(topicMap), aiSource, new Date().toISOString(), materialId)
}

export function listMaterials(userId, { all = false } = {}) {
  const rows = all
    ? db
        .prepare(
          `SELECT m.*, u.name as owner_name FROM materials m JOIN users u ON u.id = m.user_id
           ORDER BY m.created_at DESC LIMIT 200`,
        )
        .all()
    : db.prepare('SELECT * FROM materials WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(userId)
  return rows.map((m) => ({
    id: m.id,
    ownerName: m.owner_name,
    originalName: m.original_name,
    mimeType: m.mime_type,
    sizeBytes: m.size_bytes,
    status: m.status,
    aiSource: m.ai_source,
    topics: m.topics_json ? JSON.parse(m.topics_json) : null,
    createdAt: m.created_at,
    analyzedAt: m.analyzed_at,
  }))
}

/* --------------------------------------------------------------- questions */

export function insertQuestions(materialId, questions, source) {
  const now = new Date().toISOString()
  const stmt = db.prepare(
    `INSERT INTO questions (material_id, topic, subtopic, difficulty, question, options_json, answer_index, explanation, source, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  )
  tx(() => {
    for (const q of questions) {
      stmt.run(materialId, q.topic, q.subtopic || null, q.difficulty, q.question, JSON.stringify(q.options), q.answer, q.explanation || null, source, now)
    }
  })
}

export const countQuestions = () => db.prepare('SELECT COUNT(*) c FROM questions').get().c

/* ---------------------------------------------------------- recommendations */

export function saveRecommendationSnapshot(userId, assessmentId, recommendations) {
  const now = new Date().toISOString()
  const stmt = db.prepare(
    `INSERT INTO recommendations (user_id, assessment_id, competency, course_id, course_title, relevance, created_at)
     VALUES (?,?,?,?,?,?,?)`,
  )
  tx(() => {
    for (const c of recommendations || []) {
      const competency = c.tags?.[0] || 'general'
      stmt.run(userId, assessmentId, competency, c.id, c.title, c.relevance ?? null, now)
    }
  })
}

export const getLatestRecommendations = (userId) =>
  db
    .prepare(
      `SELECT competency, course_id as courseId, course_title as courseTitle, relevance, created_at as createdAt
       FROM recommendations WHERE user_id = ? ORDER BY created_at DESC LIMIT 12`,
    )
    .all(userId)

/* -------------------------------------------------------- learning progress */

export function upsertLearningProgress(userId, { competency, courseId, courseTitle, status }) {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO learning_progress (user_id, competency, course_id, course_title, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(user_id, course_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
  ).run(userId, competency, courseId, courseTitle, status, now, now)
}

export const listLearningProgress = (userId) =>
  db
    .prepare('SELECT competency, course_id as courseId, course_title as courseTitle, status, updated_at as updatedAt FROM learning_progress WHERE user_id = ?')
    .all(userId)

/* -------------------------------------------------------------- admin stats */

export function getAdminStats() {
  const usersByRole = Object.fromEntries(
    db.prepare('SELECT role, COUNT(*) c FROM users GROUP BY role').all().map((r) => [r.role, r.c]),
  )
  const departments = db
    .prepare("SELECT department, COUNT(*) c FROM users WHERE department IS NOT NULL GROUP BY department ORDER BY c DESC")
    .all()
  const materialsCount = db.prepare('SELECT COUNT(*) c FROM materials').get().c
  const questionsCount = countQuestions()
  const assessmentsCount = db.prepare('SELECT COUNT(*) c FROM assessments').get().c
  const avgOverall = db.prepare('SELECT AVG(overall) a FROM assessments').get().a
  const recentMaterials = db
    .prepare(
      `SELECT m.id, m.original_name as originalName, m.status, m.created_at as createdAt, u.name as ownerName
       FROM materials m JOIN users u ON u.id = m.user_id ORDER BY m.created_at DESC LIMIT 8`,
    )
    .all()
  const recentUsers = db
    .prepare('SELECT id, name, email, role, department, created_at as createdAt FROM users ORDER BY created_at DESC LIMIT 8')
    .all()
  return {
    totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
    usersByRole,
    departments,
    materialsCount,
    questionsCount,
    assessmentsCount,
    avgOverall: avgOverall != null ? Math.round(avgOverall) : null,
    recentMaterials,
    recentUsers,
  }
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

  // 1 admin + 1 training manager + 1 primary learner + a demo cohort
  createUser({
    email: 'admin@nexora.gov.in',
    password: 'demo1234',
    name: 'System Admin',
    role: 'admin',
    department: 'Capacity Building Commission',
  })

  createUser({
    email: 'manager@nexora.gov.in',
    password: 'demo1234',
    name: 'Nodal Training Manager',
    role: 'manager',
    department: 'National Sample Survey Office',
  })

  const primary = createUser({
    email: 'learner@nexora.gov.in',
    password: 'demo1234',
    name: 'Arun Kumar',
    role: 'learner',
    department: 'Statistical Training',
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
  const arunResult = scoreQuiz(qs, ans)
  arunResult.takenAt = '2026-09-07T14:00:00Z'
  insAssess.run(
    primary.id,
    SAMPLE_DOCUMENT.name,
    arunResult.overall,
    arunResult.correctCount,
    arunResult.totalQuestions,
    'offline',
    JSON.stringify(arunResult),
    arunResult.takenAt,
  )
  upsertProfile(primary.id, mergeProfile({ 'basic-stats': 84, probability: 58, regression: 55, visualization: 70 }, arunResult))

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
