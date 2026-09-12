// Deterministic competency analysis — no LLM needed.
// Turns raw quiz answers into topic-wise bands + plain-language "why" explanations.

import { labelFor } from '../data/competencyFramework.js'

export const BANDS = {
  strong: { key: 'strong', label: 'Strong', min: 75, color: '#0d9488' },
  moderate: { key: 'moderate', label: 'Moderate', min: 50, color: '#d97706' },
  gap: { key: 'gap', label: 'Competency Gap', min: 0, color: '#e11d48' },
}

export function bandFor(pct) {
  if (pct >= BANDS.strong.min) return BANDS.strong
  if (pct >= BANDS.moderate.min) return BANDS.moderate
  return BANDS.gap
}

// answers: { [questionId]: selectedIndex }
export function scoreQuiz(questions, answers) {
  const byTopic = {}
  let correctCount = 0

  questions.forEach((q) => {
    const sel = answers[q.id]
    const isCorrect = sel === q.answer
    if (isCorrect) correctCount++
    const t = (byTopic[q.topic] ||= {
      topic: q.topic,
      label: labelFor(q.topic),
      total: 0,
      correct: 0,
      missed: [],
      seenDifficulties: {},
    })
    t.total++
    t.seenDifficulties[q.difficulty] = (t.seenDifficulties[q.difficulty] || 0) + 1
    if (isCorrect) t.correct++
    else t.missed.push({ subtopic: q.subtopic, difficulty: q.difficulty, question: q.question })
  })

  const perTopic = Object.values(byTopic)
    .map((t) => {
      const pct = Math.round((t.correct / t.total) * 100)
      return { ...t, pct, band: bandFor(pct).key, bandLabel: bandFor(pct).label }
    })
    .sort((a, b) => a.pct - b.pct)

  const overall = Math.round((correctCount / questions.length) * 100)

  return {
    overall,
    correctCount,
    totalQuestions: questions.length,
    perTopic,
    strengths: perTopic.filter((t) => t.band === 'strong'),
    gaps: perTopic.filter((t) => t.band !== 'strong'),
    explanations: perTopic.filter((t) => t.band !== 'strong').map(explainTopic),
    narrative: buildNarrative(overall, perTopic),
    takenAt: new Date().toISOString(),
  }
}

function uniqueSubtopics(missed) {
  return [...new Set(missed.map((m) => m.subtopic).filter(Boolean))]
}

function explainTopic(t) {
  const subs = uniqueSubtopics(t.missed)
  const subPhrase = subs.length
    ? subs.slice(0, 3).join(', ')
    : 'several core ideas'
  const missedHard = t.missed.filter((m) => m.difficulty === 'Hard').length
  const missedEasy = t.missed.filter((m) => m.difficulty === 'Easy').length
  const hardSeen = t.seenDifficulties.Hard || 0

  let why
  if (t.band === 'gap' && missedEasy > 0) {
    why = `Core concepts in ${t.label} need to be rebuilt from the basics. Foundational questions on ${subPhrase} were answered incorrectly, so higher-level material will not hold until these are addressed.`
  } else if (missedHard >= Math.max(1, Math.ceil(hardSeen / 2)) && missedEasy === 0) {
    why = `You have the fundamentals of ${t.label}, but accuracy drops on application-level questions — especially deciding ${subs.length ? `when to use ${subPhrase}` : 'how to apply the concepts to a real survey scenario'}.`
  } else {
    why = `Your understanding of ${t.label} is partial and inconsistent. You handle routine cases but make errors on ${subPhrase}, which points to gaps in the underlying reasoning rather than simple slips.`
  }

  return {
    topic: t.topic,
    label: t.label,
    band: t.band,
    pct: t.pct,
    weakSubtopics: subs,
    why,
  }
}

function buildNarrative(overall, perTopic) {
  const gaps = perTopic.filter((t) => t.band === 'gap')
  const strong = perTopic.filter((t) => t.band === 'strong')
  const parts = [`Overall competency for this assessment is ${overall}%.`]
  if (strong.length) parts.push(`Strengths were seen in ${strong.map((t) => t.label).join(', ')}.`)
  if (gaps.length) {
    parts.push(
      `The clearest competency gap${gaps.length > 1 ? 's are' : ' is'} in ${gaps
        .map((t) => `${t.label} (${t.pct}%)`)
        .join(', ')} — this should drive the next learning cycle.`,
    )
  } else {
    parts.push('No critical gaps were detected; focus can shift to depth and advanced application.')
  }
  return parts.join(' ')
}

/* ----- blend a quiz result into a running per-competency profile (0-100) ----- */
export function mergeProfile(prevProfile, result) {
  const next = { ...(prevProfile || {}) }
  result.perTopic.forEach((t) => {
    next[t.topic] = next[t.topic] == null ? t.pct : Math.round(next[t.topic] * 0.4 + t.pct * 0.6)
  })
  return next
}
