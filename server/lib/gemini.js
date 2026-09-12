// Server-side AI layer. Uses Google Gemini when GEMINI_API_KEY is set; otherwise
// (or on any failure) returns the bundled pre-analyzed sample so the platform
// always works. The API key never reaches the browser.

import { GoogleGenerativeAI } from '@google/generative-ai'
import { COMPETENCIES } from '../../src/data/competencyFramework.js'
import { SAMPLE_TOPIC_MAP, SAMPLE_QUESTION_BANK } from '../../src/data/sampleAnalysis.js'

const KEY = process.env.GEMINI_API_KEY?.trim()
const MODEL = 'gemini-1.5-flash'

export const hasLiveAI = () => Boolean(KEY)

const IDS = COMPETENCIES.map((c) => c.id)
const HINT = COMPETENCIES.map((c) => `${c.id} (${c.label})`).join(', ')

function model() {
  return new GoogleGenerativeAI(KEY).getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  })
}
const clip = (t, n = 12000) => (t || '').slice(0, n)

export async function analyzeDocument(text, documentName) {
  if (!KEY || !text) {
    return { ...SAMPLE_TOPIC_MAP, documentName: documentName || SAMPLE_TOPIC_MAP.documentName, source: 'offline' }
  }
  try {
    const prompt = `You are a curriculum analyst for India's Official Statistical System.
Analyse the learning material below and return JSON with this exact shape:
{ "summary": "2-3 sentence overview",
  "overallDifficulty": "Easy" | "Medium" | "Hard",
  "topics": [ { "id": one of [${IDS.join(', ')}], "label": "topic name",
    "difficulty": "Easy" | "Medium" | "Hard", "subtopics": ["..."], "concepts": ["..."] } ] }
Pick 3 to 6 topics. Map each to the closest id from: ${HINT}.
MATERIAL:
"""${clip(text)}"""`
    const res = await model().generateContent(prompt)
    const data = JSON.parse(res.response.text())
    const topics = (data.topics || [])
      .filter((t) => IDS.includes(t.id))
      .map((t) => ({
        id: t.id,
        label: t.label || t.id,
        difficulty: ['Easy', 'Medium', 'Hard'].includes(t.difficulty) ? t.difficulty : 'Medium',
        subtopics: Array.isArray(t.subtopics) ? t.subtopics.slice(0, 6) : [],
        concepts: Array.isArray(t.concepts) ? t.concepts.slice(0, 6) : [],
      }))
    if (!topics.length) throw new Error('no usable topics')
    return {
      documentName: documentName || 'Uploaded document',
      summary: data.summary || '',
      overallDifficulty: data.overallDifficulty || 'Medium',
      topics,
      source: 'live',
    }
  } catch (e) {
    console.warn('[gemini] analyzeDocument -> offline fallback:', e.message)
    return { ...SAMPLE_TOPIC_MAP, documentName: documentName || SAMPLE_TOPIC_MAP.documentName, source: 'offline' }
  }
}

function normalize(list) {
  return (list || [])
    .map((q, i) => {
      const options = Array.isArray(q.options) ? q.options.slice(0, 4) : []
      let answer = Number(q.answer)
      if (!Number.isInteger(answer) || answer < 0 || answer > 3) answer = 0
      return {
        id: q.id || `g${i + 1}`,
        topic: IDS.includes(q.topic) ? q.topic : 'basic-stats',
        subtopic: q.subtopic || '',
        difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
        question: q.question || '',
        options,
        answer,
        explanation: q.explanation || '',
      }
    })
    .filter((q) => q.question && q.options.length === 4)
}

function fallbackQuestions(count, topicIds) {
  let pool = SAMPLE_QUESTION_BANK
  if (topicIds?.length) {
    const filtered = pool.filter((q) => topicIds.includes(q.topic))
    if (filtered.length >= Math.min(count, 8)) pool = filtered
  }
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}

export async function generateQuiz(text, count, topicIds = []) {
  if (!KEY || !text) return { questions: fallbackQuestions(count, topicIds), source: 'offline' }
  try {
    const prompt = `Create ${count} multiple-choice questions from the learning material below,
for training officers in India's Official Statistical System.
Return JSON: { "questions": [ {
  "topic": one of [${topicIds.join(', ') || IDS.join(', ')}],
  "subtopic": "short phrase", "difficulty": "Easy" | "Medium" | "Hard",
  "question": "...", "options": ["A","B","C","D"], "answer": 0-3,
  "explanation": "1-2 sentences" } ] }
Rules: mix difficulties, spread across the listed topics, base every question on the material,
no "all of the above", keep options plausible.
MATERIAL:
"""${clip(text)}"""`
    const res = await model().generateContent(prompt)
    const data = JSON.parse(res.response.text())
    const questions = normalize(data.questions).slice(0, count)
    if (questions.length < Math.min(count, 5)) throw new Error('too few valid questions')
    return { questions, source: 'live' }
  } catch (e) {
    console.warn('[gemini] generateQuiz -> offline fallback:', e.message)
    return { questions: fallbackQuestions(count, topicIds), source: 'offline' }
  }
}
