// Seeded cohort for the Admin / Training Officer dashboard.
// Deterministic (seeded PRNG) so the demo shows the same numbers every time.

import { COMPETENCY_ORDER } from './competencyFramework.js'

const DEPARTMENTS = [
  'National Sample Survey Office',
  'Economic Statistics Division',
  'Social Statistics Division',
  'Price Statistics Division',
  'State Directorate of Economics & Statistics',
]

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Per-competency base difficulty for the cohort — lower = the org is weaker here.
const BASE = {
  'basic-stats': 82,
  probability: 74,
  'data-collection': 78,
  sampling: 58,
  regression: 61,
  'data-quality': 70,
  estimation: 55,
  visualization: 66,
  'standards-ethics': 80,
}

export function buildCohort(size = 32) {
  const rnd = mulberry32(20260906)
  const learners = []
  for (let i = 0; i < size; i++) {
    const dept = DEPARTMENTS[Math.floor(rnd() * DEPARTMENTS.length)]
    const skill = 0.75 + rnd() * 0.5 // individual multiplier
    const topics = {}
    COMPETENCY_ORDER.forEach((id) => {
      const noise = (rnd() - 0.5) * 26
      topics[id] = Math.max(20, Math.min(99, Math.round(BASE[id] * skill + noise)))
    })
    const scores = Object.values(topics)
    const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    learners.push({
      id: `L${String(i + 1).padStart(3, '0')}`,
      name: `Officer ${i + 1}`,
      department: dept,
      overall,
      topics,
      assessments: 1 + Math.floor(rnd() * 4),
      trainingCompletion: Math.round(40 + rnd() * 55),
      lastActive: `${1 + Math.floor(rnd() * 27)} Aug 2026`,
    })
  }
  return learners
}

export const DEPARTMENT_LIST = DEPARTMENTS
