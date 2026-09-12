// Builds a personalised, ordered learning path from the competency gaps.
// Uses the prerequisite graph so foundations come before advanced topics.

import { COMPETENCY_BY_ID, COMPETENCY_ORDER } from '../data/competencyFramework.js'

// Expand gaps to include any weak prerequisites, then order by the graph.
function expandWithPrereqs(gapIds, profile) {
  const needed = new Set(gapIds)
  gapIds.forEach((id) => {
    ;(COMPETENCY_BY_ID[id]?.prereq || []).forEach((p) => {
      const score = profile?.[p]
      if (score == null || score < 75) needed.add(p)
    })
  })
  return COMPETENCY_ORDER.filter((id) => needed.has(id))
}

export function buildLearningPath(result, profile) {
  const gapIds = result.gaps.map((g) => g.topic)
  if (!gapIds.length) return { steps: [], done: true }

  const ordered = expandWithPrereqs(gapIds, profile)
  const gapMeta = Object.fromEntries(result.gaps.map((g) => [g.topic, g]))
  const explByTopic = Object.fromEntries(result.explanations.map((e) => [e.topic, e]))

  const steps = []
  ordered.forEach((id, idx) => {
    const c = COMPETENCY_BY_ID[id]
    const meta = gapMeta[id]
    const expl = explByTopic[id]
    const weakSubs = expl?.weakSubtopics?.length ? expl.weakSubtopics : c.subtopics.slice(0, 2)
    const isPrereqOnly = !meta

    steps.push({
      order: idx + 1,
      topic: id,
      label: c.label,
      kind: isPrereqOnly ? 'Prerequisite refresher' : meta.band === 'gap' ? 'Priority focus' : 'Reinforcement',
      target: isPrereqOnly ? 'Refresh to 80%+' : `Raise from ${meta.pct}% to 75%+`,
      activities: [
        `Study: ${c.label} — concentrate on ${weakSubs.slice(0, 2).join(' & ')}`,
        `Worked examples: apply ${weakSubs[0] || c.label} to a survey scenario`,
        `Practice set: 8 targeted questions on ${c.label}`,
      ],
    })
  })

  steps.push({
    order: steps.length + 1,
    topic: null,
    label: 'Reassessment',
    kind: 'Checkpoint',
    target: 'Confirm each gap topic is now 75%+',
    activities: ['Retake a fresh assessment on the same topics', 'Compare pre- vs post-training competency'],
  })

  return { steps, done: false }
}
