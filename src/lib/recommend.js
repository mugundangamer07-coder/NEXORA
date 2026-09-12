// iGOT Karmayogi recommendation engine.
// INTEGRATION BOUNDARY: getCatalogue() is the only thing to replace with a
// real iGOT API call. Ranking logic below stays the same.

import { getCatalogue } from '../data/igotCatalogue.js'

const LEVEL_BONUS = { Beginner: 0, Intermediate: 4, Advanced: 8 }

export async function recommendTraining(result, profile) {
  const catalogue = await getCatalogue()

  // Severity weight per gap topic: bigger gap => higher priority.
  const weight = {}
  result.gaps.forEach((g) => {
    weight[g.topic] = (100 - g.pct) + (g.band === 'gap' ? 25 : 0)
  })

  const scored = catalogue
    .map((course) => {
      let relevance = 0
      course.tags.forEach((tag) => {
        if (weight[tag]) relevance += weight[tag]
      })
      if (!relevance) return null
      // prefer beginner/intermediate for true gaps, advanced for moderate topics
      const worstBandForCourse = course.tags.some((t) => result.gaps.find((g) => g.topic === t && g.band === 'gap'))
        ? 'gap'
        : 'moderate'
      const levelFit = worstBandForCourse === 'gap' ? -LEVEL_BONUS[course.level] : LEVEL_BONUS[course.level]
      const score = relevance + levelFit + course.rating
      const pct = Math.min(98, Math.round(55 + relevance / 3))
      return { ...course, relevance: pct, _score: score }
    })
    .filter(Boolean)
    .sort((a, b) => b._score - a._score)

  return scored.slice(0, 6)
}
