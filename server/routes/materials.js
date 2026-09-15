import { Router } from 'express'
import multer from 'multer'
import { extname } from 'node:path'
import { requireAuth } from '../auth.js'
import { insertMaterial, listMaterials, getMaterialById } from '../db.js'

const r = Router()
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB — stated limit for this prototype

// The raw PDF is only ever needed transiently: text extraction happens in the
// browser (pdf.js) and it's that extracted text — not the file bytes — that
// gets persisted. Memory storage keeps this endpoint serverless-friendly (no
// dependency on a writable/persistent disk) with no loss of functionality.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const okType = file.mimetype === 'application/pdf'
    const okExt = extname(file.originalname).toLowerCase() === '.pdf'
    if (!okType || !okExt) return cb(new Error('Only PDF files are accepted for this prototype.'))
    cb(null, true)
  },
})

function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next()
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? `File is larger than the ${MAX_BYTES / (1024 * 1024)}MB limit.` : err.message
    res.status(400).json({ error: message })
  })
}

// POST /api/materials/upload — multipart form field name: "file"
r.post(
  '/upload',
  requireAuth,
  uploadSingle,
  wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file received (field name must be "file").' })
    const material = await insertMaterial(req.user.id, {
      originalName: req.file.originalname,
      storedFilename: `${Date.now()}-${req.file.originalname}`,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    })
    res.json({
      materialId: material.id,
      originalName: material.original_name,
      sizeBytes: material.size_bytes,
      status: material.status,
    })
  }),
)

// GET /api/materials — the current user's own uploads; managers/admins see everyone's.
r.get(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const seeAll = ['manager', 'admin'].includes(req.user.role)
    res.json(await listMaterials(req.user.id, { all: seeAll }))
  }),
)

r.get(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const m = await getMaterialById(Number(req.params.id))
    if (!m) return res.status(404).json({ error: 'Material not found' })
    const isOwner = m.user_id === req.user.id
    const canSeeAll = ['manager', 'admin'].includes(req.user.role)
    if (!isOwner && !canSeeAll) return res.status(403).json({ error: 'Not your material' })
    res.json({
      id: m.id,
      originalName: m.original_name,
      mimeType: m.mime_type,
      sizeBytes: m.size_bytes,
      status: m.status,
      aiSource: m.ai_source,
      topics: m.topics_json ? JSON.parse(m.topics_json) : null,
      createdAt: m.created_at,
      analyzedAt: m.analyzed_at,
    })
  }),
)

export default r
