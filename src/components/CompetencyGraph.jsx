import { useMemo } from 'react'
import { COMPETENCIES, COMPETENCY_BY_ID } from '../data/competencyFramework.js'

// Visual skill-dependency map. Nodes are coloured by the learner's profile:
// teal = strong (>=75), amber = moderate (50-74), rose = gap (<50), grey = not assessed.

function depthOf(id, memo = {}) {
  if (memo[id] != null) return memo[id]
  const pre = COMPETENCY_BY_ID[id]?.prereq || []
  const d = pre.length ? 1 + Math.max(...pre.map((p) => depthOf(p, memo))) : 0
  memo[id] = d
  return d
}

export default function CompetencyGraph({ profile = {}, highlight = [] }) {
  const { nodes, edges, width, height } = useMemo(() => {
    const memo = {}
    const byDepth = {}
    COMPETENCIES.forEach((c) => {
      const d = depthOf(c.id, memo)
      ;(byDepth[d] ||= []).push(c.id)
    })
    const colW = 210
    const rowH = 92
    const maxCol = Math.max(...Object.keys(byDepth).map(Number))
    const maxRows = Math.max(...Object.values(byDepth).map((a) => a.length))
    const pos = {}
    Object.entries(byDepth).forEach(([d, ids]) => {
      const dn = Number(d)
      ids.forEach((id, i) => {
        const colCount = ids.length
        const yGap = (maxRows * rowH) / (colCount + 1)
        pos[id] = { x: 95 + dn * colW, y: yGap * (i + 1) }
      })
    })
    const edges = []
    COMPETENCIES.forEach((c) => {
      ;(c.prereq || []).forEach((p) => edges.push({ from: pos[p], to: pos[c.id] }))
    })
    const nodes = COMPETENCIES.map((c) => {
      const score = profile[c.id]
      const band = score == null ? 'none' : score >= 75 ? 'strong' : score >= 50 ? 'moderate' : 'gap'
      return { ...c, ...pos[c.id], score, band, isHot: highlight.includes(c.id) }
    })
    return { nodes, edges, width: 150 + maxCol * colW, height: maxRows * rowH + 20 }
  }, [profile, highlight])

  const fill = { strong: '#0d9488', moderate: '#d97706', gap: '#e11d48', none: '#94a3b8' }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        {edges.map((e, i) => (
          <line key={i} x1={e.from.x + 74} y1={e.from.y} x2={e.to.x - 74} y2={e.to.y} stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow)" />
        ))}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#cbd5e1" />
          </marker>
        </defs>
        {nodes.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x - 74}
              y={n.y - 26}
              width="148"
              height="52"
              rx="10"
              fill="#fff"
              stroke={n.isHot ? '#2563EB' : fill[n.band]}
              strokeWidth={n.isHot ? 3 : 2}
            />
            <circle cx={n.x - 58} cy={n.y} r="6" fill={fill[n.band]} />
            <text x={n.x - 44} y={n.y - 3} style={{ fontSize: 11, fontWeight: 700 }} fill="#0B2447">
              {n.label.length > 20 ? n.label.slice(0, 19) + '…' : n.label}
            </text>
            <text x={n.x - 44} y={n.y + 12} style={{ fontSize: 10 }} fill="#64748b">
              {n.score == null ? 'not assessed' : `${n.score}%`}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
