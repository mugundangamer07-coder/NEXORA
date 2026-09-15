import { createClient } from '@libsql/client'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { buildCohort } from '../src/data/seedCohort.js'
import { COMPETENCY_ORDER } from '../src/data/competencyFramework.js'
import { SAMPLE_QUESTION_BANK, SAMPLE_DOCUMENT } from '../src/data/sampleAnalysis.js'
import { scoreQuiz, mergeProfile } from '../src/lib/scoring.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Local dev / Render: a real file on persistent disk (unchanged behaviour).
// Vercel with a hosted database configured: libSQL speaks the Turso wire
// protocol directly, so TURSO_DATABASE_URL/TURSO_AUTH_TOKEN just work.
// Vercel with nothing configured: fall back to a /tmp file so the process
// doesn't crash (Vercel's filesystem is read-only outside /tmp) — this keeps
// the bundled demo working, but writes don't survive a cold start until a
// real TURSO_DATABASE_URL is set. isEphemeral reflects that to callers.
function resolveDbUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL
  if (process.env.VERCEL) return `file:${join(tmpdir(), 'nexora.db')}`
  const localPath = process.env.NEXORA_DB || join(__dirname, '..', 'data', 'nexora.db')
  mkdirSync(dirname(localPath), { recursive: true })
  return `file:${localPath}`
}

export const isEphemeral = Boolean(process.env.VERCEL) && !process.env.TURSO_DATABASE_URL

export const client = createClient({
  url: resolveDbUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
})

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'learner',
  department    TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name   TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      INTEGER NOT NULL,
  extracted_text  TEXT,
  topics_json     TEXT,
  ai_source       TEXT,
  status          TEXT NOT NULL DEFAULT 'uploaded',
  created_at      TEXT NOT NULL,
  analyzed_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id, created_at);

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

CREATE TABLE IF NOT EXISTS questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id   INTEGER REFERENCES materials(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL,
  subtopic      TEXT,
  difficulty    TEXT NOT NULL,
  question      TEXT NOT NULL,
  options_json  TEXT NOT NULL,
  answer_index  INTEGER NOT NULL,
  explanation   TEXT,
  source        TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_material ON questions(material_id);

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

CREATE TABLE IF NOT EXISTS learning_progress (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency     TEXT NOT NULL,
  course_id      TEXT NOT NULL,
  course_title   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'recommended',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE(user_id, course_id)
);
`

// Schema creation + seeding must finish before any request touches the
// database. This is memoized per process, so a warm serverless instance
// only pays for it once; a cold one pays for it on its first request
// (wired up as Express middleware in server/index.js).
let readyPromise = null
export function ensureReady() {
  if (!readyPromise) readyPromise = init()
  return readyPromise
}

async function init() {
  await client.executeMultiple(SCHEMA_SQL)
  // one-time, additive migrations for databases created before this schema
  try {
    await client.execute("UPDATE users SET role = 'manager' WHERE role = 'officer'")
  } catch {}
  try {
    await client.execute('ALTER TABLE assessments ADD COLUMN material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL')
  } catch {
    // column already exists — fine.
  }
  await seedIfEmpty()
}

/* --------------------------------------------------------------- helpers */

export async function createUser({ email, password, name, role = 'learner', department = null }) {
  const hash = bcrypt.hashSync(password, 10)
  const rs = await client.execute({
    sql: 'INSERT INTO users (email, password_hash, name, role, department, created_at) VALUES (?,?,?,?,?,?)',
    args: [email.toLowerCase().trim(), hash, name.trim(), role, department, new Date().toISOString()],
  })
  return getUserById(Number(rs.lastInsertRowid))
}
export async function getUserByEmail(email) {
  const rs = await client.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [String(email).toLowerCase().trim()] })
  return rs.rows[0] ? rowToObj(rs.rows[0], rs.columns) : null
}
export async function getUserById(id) {
  const rs = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] })
  return rs.rows[0] ? rowToObj(rs.rows[0], rs.columns) : null
}

// libSQL Row objects don't spread/serialize cleanly as plain objects — this
// gives every caller a normal JS object keyed by column name.
function rowToObj(row, columns) {
  const obj = {}
  columns.forEach((c, i) => (obj[c] = row[i]))
  return obj
}
function rowsToObjs(rs) {
  return rs.rows.map((r) => rowToObj(r, rs.columns))
}

export function publicUser(u) {
  if (!u) return null
  return { id: u.id, email: u.email, name: u.name, role: u.role, department: u.department }
}

export async function getProfile(userId) {
  const rs = await client.execute({ sql: 'SELECT competency, score FROM profile WHERE user_id = ?', args: [userId] })
  return Object.fromEntries(rowsToObjs(rs).map((r) => [r.competency, r.score]))
}

export async function upsertProfile(userId, profileObj) {
  const now = new Date().toISOString()
  const entries = Object.entries(profileObj)
  if (!entries.length) return
  await client.batch(
    entries.map(([competency, score]) => ({
      sql: `INSERT INTO profile (user_id, competency, score, updated_at) VALUES (?,?,?,?)
            ON CONFLICT(user_id, competency) DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at`,
      args: [userId, competency, Math.round(score), now],
    })),
    'write',
  )
}

export async function getHistory(userId, limit = 25) {
  const rs = await client.execute({
    sql: `SELECT id, document_name, overall, correct_count, total_questions, source, taken_at
          FROM assessments WHERE user_id = ? ORDER BY taken_at ASC LIMIT ?`,
    args: [userId, limit],
  })
  return rowsToObjs(rs).map((r) => ({
    id: r.id,
    documentName: r.document_name,
    overall: r.overall,
    correctCount: r.correct_count,
    totalQuestions: r.total_questions,
    source: r.source,
    takenAt: r.taken_at,
  }))
}

export async function insertAssessment(userId, { documentName, source, result, materialId = null }) {
  const rs = await client.execute({
    sql: `INSERT INTO assessments
          (user_id, material_id, document_name, overall, correct_count, total_questions, source, result_json, taken_at)
          VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [
      userId,
      materialId,
      documentName || null,
      result.overall,
      result.correctCount ?? null,
      result.totalQuestions ?? null,
      source || null,
      JSON.stringify(result),
      result.takenAt || new Date().toISOString(),
    ],
  })
  return Number(rs.lastInsertRowid)
}

export async function latestResult(userId) {
  const rs = await client.execute({
    sql: 'SELECT result_json FROM assessments WHERE user_id = ? ORDER BY taken_at DESC LIMIT 1',
    args: [userId],
  })
  return rs.rows[0] ? JSON.parse(rs.rows[0][0]) : null
}

/* --------------------------------------------------------------- materials */

export async function insertMaterial(userId, { originalName, storedFilename, mimeType, sizeBytes }) {
  const rs = await client.execute({
    sql: `INSERT INTO materials (user_id, original_name, stored_filename, mime_type, size_bytes, status, created_at)
          VALUES (?,?,?,?,?,'uploaded',?)`,
    args: [userId, originalName, storedFilename, mimeType, sizeBytes, new Date().toISOString()],
  })
  return getMaterialById(Number(rs.lastInsertRowid))
}

export async function getMaterialById(id) {
  const rs = await client.execute({ sql: 'SELECT * FROM materials WHERE id = ?', args: [id] })
  return rs.rows[0] ? rowToObj(rs.rows[0], rs.columns) : null
}

export async function saveMaterialAnalysis(materialId, { extractedText, topicMap, aiSource }) {
  await client.execute({
    sql: `UPDATE materials SET extracted_text = ?, topics_json = ?, ai_source = ?, status = 'analyzed', analyzed_at = ?
          WHERE id = ?`,
    args: [extractedText?.slice(0, 20000) || null, JSON.stringify(topicMap), aiSource, new Date().toISOString(), materialId],
  })
}

export async function listMaterials(userId, { all = false } = {}) {
  const rs = all
    ? await client.execute(
        `SELECT m.*, u.name as owner_name FROM materials m JOIN users u ON u.id = m.user_id
         ORDER BY m.created_at DESC LIMIT 200`,
      )
    : await client.execute({ sql: 'SELECT * FROM materials WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', args: [userId] })
  return rowsToObjs(rs).map((m) => ({
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

export async function insertQuestions(materialId, questions, source) {
  if (!questions.length) return
  const now = new Date().toISOString()
  await client.batch(
    questions.map((q) => ({
      sql: `INSERT INTO questions (material_id, topic, subtopic, difficulty, question, options_json, answer_index, explanation, source, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [materialId, q.topic, q.subtopic || null, q.difficulty, q.question, JSON.stringify(q.options), q.answer, q.explanation || null, source, now],
    })),
    'write',
  )
}

export async function countQuestions() {
  const rs = await client.execute('SELECT COUNT(*) c FROM questions')
  return rs.rows[0][0]
}

/* ---------------------------------------------------------- recommendations */

export async function saveRecommendationSnapshot(userId, assessmentId, recommendations) {
  if (!recommendations?.length) return
  const now = new Date().toISOString()
  await client.batch(
    recommendations.map((c) => ({
      sql: `INSERT INTO recommendations (user_id, assessment_id, competency, course_id, course_title, relevance, created_at)
            VALUES (?,?,?,?,?,?,?)`,
      args: [userId, assessmentId, c.tags?.[0] || 'general', c.id, c.title, c.relevance ?? null, now],
    })),
    'write',
  )
}

export async function getLatestRecommendations(userId) {
  const rs = await client.execute({
    sql: `SELECT competency, course_id as courseId, course_title as courseTitle, relevance, created_at as createdAt
          FROM recommendations WHERE user_id = ? ORDER BY created_at DESC LIMIT 12`,
    args: [userId],
  })
  return rowsToObjs(rs)
}

/* -------------------------------------------------------- learning progress */

export async function upsertLearningProgress(userId, { competency, courseId, courseTitle, status }) {
  const now = new Date().toISOString()
  await client.execute({
    sql: `INSERT INTO learning_progress (user_id, competency, course_id, course_title, status, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?)
          ON CONFLICT(user_id, course_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    args: [userId, competency, courseId, courseTitle, status, now, now],
  })
}

export async function listLearningProgress(userId) {
  const rs = await client.execute({
    sql: 'SELECT competency, course_id as courseId, course_title as courseTitle, status, updated_at as updatedAt FROM learning_progress WHERE user_id = ?',
    args: [userId],
  })
  return rowsToObjs(rs)
}

/* -------------------------------------------------------------- admin stats */

export async function getAdminStats() {
  const roleRows = rowsToObjs(await client.execute('SELECT role, COUNT(*) c FROM users GROUP BY role'))
  const usersByRole = Object.fromEntries(roleRows.map((r) => [r.role, r.c]))
  const departments = rowsToObjs(
    await client.execute("SELECT department, COUNT(*) c FROM users WHERE department IS NOT NULL GROUP BY department ORDER BY c DESC"),
  )
  const materialsCount = (await client.execute('SELECT COUNT(*) c FROM materials')).rows[0][0]
  const questionsCount = await countQuestions()
  const assessmentsCount = (await client.execute('SELECT COUNT(*) c FROM assessments')).rows[0][0]
  const avgOverallRow = (await client.execute('SELECT AVG(overall) a FROM assessments')).rows[0][0]
  const recentMaterials = rowsToObjs(
    await client.execute(
      `SELECT m.id, m.original_name as originalName, m.status, m.created_at as createdAt, u.name as ownerName
       FROM materials m JOIN users u ON u.id = m.user_id ORDER BY m.created_at DESC LIMIT 8`,
    ),
  )
  const recentUsers = rowsToObjs(
    await client.execute('SELECT id, name, email, role, department, created_at as createdAt FROM users ORDER BY created_at DESC LIMIT 8'),
  )
  return {
    totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
    usersByRole,
    departments,
    materialsCount,
    questionsCount,
    assessmentsCount,
    avgOverall: avgOverallRow != null ? Math.round(avgOverallRow) : null,
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

export async function seedIfEmpty() {
  const n = (await client.execute('SELECT COUNT(*) c FROM users')).rows[0][0]
  if (n > 0) return

  const now = new Date().toISOString()

  // 1 admin + 1 training manager + 1 primary learner + a demo cohort
  await createUser({
    email: 'admin@nexora.gov.in',
    password: 'demo1234',
    name: 'System Admin',
    role: 'admin',
    department: 'Capacity Building Commission',
  })

  await createUser({
    email: 'manager@nexora.gov.in',
    password: 'demo1234',
    name: 'Nodal Training Manager',
    role: 'manager',
    department: 'National Sample Survey Office',
  })

  const primary = await createUser({
    email: 'learner@nexora.gov.in',
    password: 'demo1234',
    name: 'Arun Kumar',
    role: 'learner',
    department: 'Statistical Training',
  })

  const insAssess = (args) =>
    client.execute({
      sql: `INSERT INTO assessments (user_id, document_name, overall, correct_count, total_questions, source, result_json, taken_at)
            VALUES (?,?,?,?,?,?,?,?)`,
      args,
    })
  // two earlier attempts for the progress sparkline (thin rows are fine — only the columns are read)
  await insAssess([primary.id, SAMPLE_DOCUMENT.name, 41, 4, 10, 'offline', JSON.stringify({ overall: 41 }), '2026-09-05T09:10:00Z'])
  await insAssess([primary.id, SAMPLE_DOCUMENT.name, 55, 6, 10, 'offline', JSON.stringify({ overall: 55 }), '2026-09-06T10:30:00Z'])

  // a real latest result computed by the actual scoring engine (~70%, mixed bands)
  const qs = SAMPLE_QUESTION_BANK.slice(0, 10)
  const ans = {}
  qs.forEach((q, i) => (ans[q.id] = i % 10 < 7 ? q.answer : (q.answer + 1) % 4))
  const arunResult = scoreQuiz(qs, ans)
  arunResult.takenAt = '2026-09-07T14:00:00Z'
  await insAssess([
    primary.id,
    SAMPLE_DOCUMENT.name,
    arunResult.overall,
    arunResult.correctCount,
    arunResult.totalQuestions,
    'offline',
    JSON.stringify(arunResult),
    arunResult.takenAt,
  ])
  await upsertProfile(primary.id, mergeProfile({ 'basic-stats': 84, probability: 58, regression: 55, visualization: 70 }, arunResult))

  // cohort — reuse the deterministic generator the frontend used
  const cohort = buildCohort(30)
  const hash = bcrypt.hashSync('demo1234', 8)

  for (let i = 0; i < cohort.length; i++) {
    const l = cohort[i]
    const dept = DEPARTMENTS[i % DEPARTMENTS.length]
    const rs = await client.execute({
      sql: 'INSERT INTO users (email, password_hash, name, role, department, created_at) VALUES (?,?,?,?,?,?)',
      args: [`l${String(i + 1).padStart(2, '0')}@nexora.demo`, hash, l.name, 'learner', dept, now],
    })
    const uid = Number(rs.lastInsertRowid)
    const prof = {}
    COMPETENCY_ORDER.forEach((id) => {
      if (l.topics[id] != null) prof[id] = l.topics[id]
    })
    await upsertProfile(uid, prof)

    const statements = []
    for (let a = 0; a < l.assessments; a++) {
      const ov = Math.max(20, Math.min(95, l.overall + (a - l.assessments / 2) * 6 + Math.round((Math.random() - 0.5) * 8)))
      statements.push({
        sql: `INSERT INTO assessments (user_id, document_name, overall, correct_count, total_questions, source, result_json, taken_at)
              VALUES (?,?,?,?,?,?,?,?)`,
        args: [uid, 'Assessment', Math.round(ov), Math.round(ov / 10), 10, 'offline', JSON.stringify({ overall: Math.round(ov) }), now],
      })
    }
    if (statements.length) await client.batch(statements, 'write')
  }
  const total = (await client.execute('SELECT COUNT(*) c FROM users')).rows[0][0]
  console.log(`[db] seeded ${total} users`)
}
