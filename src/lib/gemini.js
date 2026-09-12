// Client AI layer — a thin wrapper over the backend. The Gemini key lives on
// the server; this uploads the file, then POSTs the extracted text and
// receives the topic map / questions (live or the server's offline fallback).

import { apiFetch, apiUpload } from './api.js'

let _live = false
export const hasLiveAI = () => _live
export const setLiveAI = (v) => {
  _live = Boolean(v)
}

// Real, validated file upload (type + size checked server-side too).
// Returns { materialId, originalName, sizeBytes, status }.
export async function uploadMaterial(file) {
  return apiUpload('/materials/upload', file)
}

export async function analyzeDocument(text, documentName, materialId) {
  try {
    return await apiFetch('/ai/analyze', { method: 'POST', body: { text, documentName, materialId } })
  } catch (e) {
    console.warn('[ai] analyze failed:', e.message)
    return { documentName: documentName || 'Uploaded document', summary: '', overallDifficulty: 'Medium', topics: [], source: 'offline' }
  }
}

export async function generateQuiz(text, count, topicMap, materialId) {
  const topicIds = (topicMap?.topics || []).map((t) => t.id)
  try {
    return await apiFetch('/ai/generate-questions', { method: 'POST', body: { text, count, topicIds, materialId } })
  } catch (e) {
    console.warn('[ai] generate-questions failed:', e.message)
    return { questions: [], source: 'offline' }
  }
}
