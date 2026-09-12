import { useMemo } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Lightbulb, ArrowRight, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppState.jsx'
import { Card, SectionTitle, ProgressRing, TopicBar, BandBadge, StatCard, Fade } from '../components/ui.jsx'
import CompetencyGraph from '../components/CompetencyGraph.jsx'

export default function Results() {
  const { state } = useApp()
  const r = state.result
  if (!r) return <Navigate to="/upload" replace />

  const wrong = useMemo(
    () =>
      (state.quiz?.questions || [])
        .map((q) => ({ q, sel: state.answers?.[q.id] }))
        .filter((x) => x.sel !== x.q.answer),
    [state.quiz, state.answers],
  )

  return (
    <div>
      <SectionTitle sub="Performance is analysed topic-by-topic, not as a single score.">
        Assessment Results
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 flex flex-col items-center justify-center text-center">
          <ProgressRing value={r.overall} />
          <div className="mt-3 text-sm text-slate-500">
            {r.correctCount} of {r.totalQuestions} correct
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="label">AI competency summary</div>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-900">{r.narrative}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard label="Strong areas" value={r.strengths.length} tone="strong" />
            <StatCard label="Needs work" value={r.gaps.filter((g) => g.band === 'moderate').length} tone="moderate" />
            <StatCard label="Competency gaps" value={r.gaps.filter((g) => g.band === 'gap').length} tone="gap" />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-bold text-ink-900 mb-2">Topic-wise performance</h3>
          {r.perTopic.map((t) => (
            <div key={t.topic}>
              <TopicBar label={t.label} pct={t.pct} band={t.band} />
            </div>
          ))}
        </Card>

        <Card>
          <h3 className="font-bold text-ink-900 mb-3">Why these gaps exist</h3>
          <div className="space-y-3">
            {r.explanations.length === 0 && (
              <p className="text-sm text-slate-500">No competency gaps detected — strong performance across all assessed topics.</p>
            )}
            {r.explanations.map((e) => (
              <div key={e.topic} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-900">{e.label}</span>
                  <BandBadge band={e.band} />
                </div>
                <p className="mt-1.5 text-sm text-slate-600 flex gap-2">
                  <Lightbulb size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  {e.why}
                </p>
                {e.weakSubtopics?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.weakSubtopics.map((s) => (
                      <span key={s} className="rounded-md bg-rose-50 px-2 py-0.5 text-xs text-rose-600">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="font-bold text-ink-900 mb-1">Competency graph</h3>
        <p className="text-sm text-slate-500 mb-3">
          Where the skill chain breaks. Gap topics (red) block the competencies that depend on them.
        </p>
        <CompetencyGraph profile={state.profile} highlight={r.gaps.map((g) => g.topic)} />
      </Card>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/path" className="btn-primary">
          See personalized learning path <ArrowRight size={16} />
        </Link>
        <Link to="/upload" className="btn-ghost">
          <RefreshCw size={15} /> New assessment
        </Link>
      </div>

      {wrong.length > 0 && (
        <Fade>
          <Card className="mt-6">
            <h3 className="font-bold text-ink-900 mb-3">Review incorrect answers ({wrong.length})</h3>
            <div className="space-y-4">
              {wrong.map(({ q, sel }) => (
                <div key={q.id} className="border-b border-slate-100 pb-4 last:border-0">
                  <p className="text-sm font-semibold text-ink-900">{q.question}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-rose-600">
                      <XCircle size={14} /> Your answer: {q.options[sel] ?? '—'}
                    </div>
                    <div className="flex items-center gap-2 text-teal-700">
                      <CheckCircle2 size={14} /> Correct: {q.options[q.answer]}
                    </div>
                  </div>
                  {q.explanation && <p className="mt-2 text-xs text-slate-500">{q.explanation}</p>}
                </div>
              ))}
            </div>
          </Card>
        </Fade>
      )}
    </div>
  )
}
