import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { GraduationCap, Star, Clock, ExternalLink, CheckCircle2, Layers, Circle, PlayCircle, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppState.jsx'
import { apiFetch } from '../lib/api.js'
import { Card, SectionTitle, Pill, Fade } from '../components/ui.jsx'

const NEXT_STATUS = { recommended: 'in_progress', in_progress: 'completed', completed: 'recommended' }
const STATUS_META = {
  recommended: { label: 'Mark as started', icon: Circle, tone: 'slate' },
  in_progress: { label: 'Mark as completed', icon: PlayCircle, tone: 'moderate' },
  completed: { label: 'Completed', icon: CheckCircle2, tone: 'strong' },
}

export default function LearningPath() {
  const { state } = useApp()
  const r = state.result
  const path = state.learningPath
  const recs = state.recommendations
  const [progress, setProgress] = useState({}) // courseId -> status

  useEffect(() => {
    let alive = true
    apiFetch('/learning-progress')
      .then((rows) => alive && setProgress(Object.fromEntries(rows.map((p) => [p.courseId, p.status]))))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!r) return <Navigate to="/upload" replace />

  async function cycleProgress(course) {
    const current = progress[course.id] || 'recommended'
    const next = NEXT_STATUS[current]
    setProgress((p) => ({ ...p, [course.id]: next })) // optimistic
    try {
      await apiFetch('/learning-progress', {
        method: 'POST',
        body: {
          competency: course.tags?.[0] || 'general',
          courseId: course.id,
          courseTitle: course.title,
          status: next,
        },
      })
    } catch {
      setProgress((p) => ({ ...p, [course.id]: current })) // revert on failure
    }
  }

  return (
    <div>
      <SectionTitle sub="Ordered using the competency dependency graph — foundations first, then advanced topics, then a reassessment.">
        Your Personalized Learning Path
      </SectionTitle>

      {!path || path.done ? (
        <Card className="flex items-center gap-3">
          <CheckCircle2 className="text-teal-600" />
          <div>
            <div className="font-semibold text-ink-900">No competency gaps to close right now.</div>
            <div className="text-sm text-slate-500">
              Focus on advanced application and take a fresh assessment to keep tracking.
            </div>
          </div>
        </Card>
      ) : (
        <ol className="relative border-l-2 border-slate-200 ml-3 space-y-4">
          {path.steps.map((s, idx) => (
            <Fade key={idx} delay={idx * 0.04}>
              <li className="ml-6">
                <span className="absolute -left-[13px] grid place-items-center w-6 h-6 rounded-full bg-brand text-white text-xs font-bold">
                  {s.order}
                </span>
                <Card>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-bold text-ink-900 flex items-center gap-2">
                      {s.label === 'Reassessment' ? <Layers size={16} /> : <GraduationCap size={16} />}
                      {s.label}
                    </h3>
                    <Pill tone={s.kind === 'Priority focus' ? 'gap' : s.kind === 'Checkpoint' ? 'blue' : 'moderate'}>
                      {s.kind}
                    </Pill>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{s.target}</div>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                    {s.activities.map((a, k) => (
                      <li key={k} className="flex gap-2">
                        <span className="text-brand">•</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            </Fade>
          ))}
        </ol>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-ink-900">Recommended Training Resources</h2>
          <Pill tone="blue">iGOT Karmayogi ecosystem — demo catalogue</Pill>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Sample course data for this prototype — NEXORA does not claim a live iGOT connection. The recommendation
          engine is integration-ready: swap in the real iGOT API and the ranking logic below is unchanged.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recs?.map((c) => {
            const status = progress[c.id] || 'recommended'
            const meta = STATUS_META[status]
            return (
              <Card key={c.id}>
                <div className="flex items-center justify-between">
                  <Pill tone="strong">{c.relevance}% relevant</Pill>
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                    <Star size={12} fill="currentColor" /> {c.rating}
                  </span>
                </div>
                <h3 className="mt-2 font-bold text-ink-900 text-sm leading-snug">{c.title}</h3>
                <div className="mt-1 text-xs text-slate-500">Source: {c.provider} (mock/sample data)</div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {c.durationHrs}h
                  </span>
                  <span>{c.level}</span>
                  <span>{c.format}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"
                  >
                    View course (demo link) <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    onClick={() => cycleProgress(c)}
                    className="inline-flex items-center gap-1 text-xs font-semibold"
                  >
                    <Pill tone={meta.tone}>
                      <meta.icon size={11} /> {meta.label}
                    </Pill>
                  </button>
                </div>
              </Card>
            )
          })}
          {(!recs || recs.length === 0) && (
            <div className="text-sm text-slate-500">No targeted courses — no gaps to address.</div>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <Link to="/dashboard" className="btn-ghost">
          Back to dashboard
        </Link>
        <Link to="/upload" className="btn-primary">
          Re-assess now <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
