// Client AI layer — now a thin wrapper over the backend. The Gemini key lives
// on the server; this just POSTs the extracted text and receives the topic map
// / questions (live or the server's bundled offline fallback).

import { apiFetch } from './api.js'

let _live = false
export const hasLiveAI = () => _live
export const setLiveAI = (v) => {
  _live = Boolean(v)
}

export async function analyzeDocument(text, documentName) {
  try {
    return await apiFetch('/ai/analyze', { method: 'POST', body: { text, documentName } })
  } catch (e) {
    console.warn('[ai] analyze failed:', e.message)
    return { documentName: documentName || 'Uploaded document', summary: '', overallDifficulty: 'Medium', topics: [], source: 'offline' }
  }
}

export async function generateQuiz(text, count, topicMap) {
  const topicIds = (topicMap?.topics || []).map((t) => t.id)
  try {
    return await apiFetch('/ai/quiz', { method: 'POST', body: { text, count, topicIds } })
  } catch (e) {
    console.warn('[ai] quiz failed:', e.message)
    return { questions: [], source: 'offline' }
  }
}
