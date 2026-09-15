import { Link } from 'react-router-dom'
import {
  Upload, ArrowRight, TrendingUp, TrendingDown, Minus, CircleCheck, TriangleAlert, Compass, Target, Activity, Network,
} from 'lucide-react'
import { useApp } from '../context/AppState.jsx'
import { COMPETENCY_ORDER, labelFor } from '../data/competencyFramework.js'
import { bandFor } from '../lib/scoring.js'
import {
  Card, CardHead, SectionTitle, ProgressRing, Pill, Dot, Legend, bandHex,
} from '../components/ui.jsx'
import { CompetencyBarChart, ProgressLineChart } from '../components/charts.jsx'
import CompetencyGraph from '../components/CompetencyGraph.jsx'

const GRAPH_LEGEND = [
  { label: 'Strong (75%+)', color: bandHex('strong') },
  { label: 'Moderate (50–74%)', color: bandHex('moderate') },
  { label: 'Competency gap (<50%)', color: bandHex('gap') },
  { label: 'Not assessed', color: bandHex('none') },
]

export default function LearnerDashboard() {
  const { state } = useApp()
  const { profile, history } = state
  const assessed = Object.keys(profile).length > 0

  const rows = COMPETENCY_ORDER.filter((id) => profile[id] != null)
    .map((id) => ({ id, label: labelFor(id), pct: profile[id], band: bandFor(profile[id]).key }))
    .sort((a, b) => a.pct - b.pct)

  const overall = assessed ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0
  const strong = rows.filter((r) => r.band === 'strong')
  const moderate = rows.filter((r) => r.band === 'moderate')
  const gaps = rows.filter((r) => r.band === 'gap')
  const weak = [...gaps, ...moderate]
  const nextStep = state.learningPath?.steps?.[0] || (weak[0] ? { label: weak[0].label } : null)

  const overallSeries = (history || []).map((h) => h.overall)
  const delta = overallSeries.length >= 2 ? overallSeries[overallSeries.length - 1] - overallSeries[0] : null

  if (!assessed) {
    return (
      <div className="max-w-4xl">
        <SectionTitle sub="No assessment taken yet. Upload a learning document to build your competency profile.">
          Learner Dashboard
        </SectionTitle>
        <Card className="flex flex-col items-center text-center py-12">
          <div className="grid place-items-center w-14 h-14 rounded-full bg-accent-50 text-accent-700">
            <Compass size={26} />
          </div>
          <h3 className="mt-4 font-bold text-ink-900 text-lg">Start your competency assessment</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            Upload a PDF, let the AI generate a quiz, and this dashboard fills with your topic-wise competency, explained
            gaps and a personalized roadmap.
          </p>
          <Link to="/upload" className="btn-primary mt-5">
            <Upload size={16} /> Upload material
          </Link>
        </Card>
        <Card className="mt-4">
          <CardHead
            title="Competency framework"
            sub="The skills NEXORA assesses for India's Official Statistical System."
            icon={Network}
          />
          <CompetencyGraph profile={{}} />
          <div className="mt-3">
            <Legend items={GRAPH_LEGEND} />
          </div>
        </Card>
      </div>
    )
  }

  const band = bandFor(overall)
  const lastAt = history?.length ? new Date(history[history.length - 1].takenAt) : null

  return (
    <div>
      <SectionTitle
        sub="Your live competency profile, updated after every assessment."
        right={
          <div className="hidden sm:flex items-center gap-2">
            {lastAt && <Pill tone="slate">Last assessed {lastAt.toLocaleDateString()}</Pill>}
            <Link to="/upload" className="btn-ghost">
              <Upload size={14} /> New assessment
            </Link>
          </div>
        }
      >
        Learner Dashboard
      </SectionTitle>

      {/* row 1 — ring + strengths/gaps */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center text-center">
          <ProgressRing value={overall} />
          <div className="mt-3 flex items-center gap-2">
            <Pill tone={band.key}>{band.label}</Pill>
            {delta != null && delta !== 0 && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                  delta > 0 ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {delta > 0 ? '+' : ''}
                {delta} pts
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">across {rows.length} assessed competencies</div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <div className="label flex items-center gap-1.5 text-teal-700">
                <CircleCheck size={13} /> Strong areas
              </div>
              <ul className="mt-2 space-y-2 text-sm">
                {strong.length ? (
                  strong.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-ink-900">
                        <Dot band="strong" /> {r.label}
                      </span>
                      <span className="text-slate-400 tabular-nums">{r.pct}%</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400">None yet — keep going.</li>
                )}
              </ul>
            </div>
            <div>
              <div className="label flex items-center gap-1.5 text-rose-600">
                <TriangleAlert size={13} /> Needs improvement
              </div>
              <ul className="mt-2 space-y-2 text-sm">
                {weak.length ? (
                  weak.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-ink-900">
                        <Dot band={r.band} /> {r.label}
                      </span>
                      <span className="text-slate-400 tabular-nums">{r.pct}%</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400">No gaps detected.</li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* row 2 — recommended next step banner */}
      {nextStep && (
        <div className="mt-4 rounded-xl border border-accent-100 bg-accent-50/60 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="grid place-items-center w-11 h-11 rounded-xl bg-accent text-white shrink-0">
            <Target size={20} />
          </span>
          <div className="flex-1">
            <div className="label text-accent-700">Recommended next step</div>
            <div className="text-lg font-bold text-ink-900 mt-0.5">{nextStep.label}</div>
            {nextStep.target && <div className="text-xs text-slate-500 mt-0.5">{nextStep.target}</div>}
          </div>
          <Link to="/path" className="btn-primary bg-accent hover:bg-accent-700 shrink-0">
            Open learning path <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* row 3 — topic breakdown + progress */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Competency by topic" icon={BarGroupIcon} sub={`${rows.length} competencies assessed`} />
          <CompetencyBarChart rows={rows} />
          <div className="mt-3">
            <Legend items={GRAPH_LEGEND.slice(0, 3)} />
          </div>
        </Card>

        <Card>
          <CardHead title="Progress over time" icon={Activity} sub={overallSeries.length >= 2 ? `${overallSeries.length} assessments` : null} />
          {overallSeries.length >= 2 && <ProgressLineChart history={history} height={140} />}
          {history?.length ? (
            <ul className="divide-y divide-slate-100">
              {[...history]
                .reverse()
                .slice(0, 6)
                .map((h, i, arr) => {
                  const prev = arr[i + 1]
                  const d = prev ? h.overall - prev.overall : null
                  return (
                    <li key={h.takenAt} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-slate-500">
                        {new Date(h.takenAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-bold text-ink-900 tabular-nums">{h.overall}%</span>
                        {d != null && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                              d > 0
                                ? 'bg-teal-50 text-teal-700'
                                : d < 0
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {d > 0 ? <TrendingUp size={10} /> : d < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                            {d > 0 ? '+' : ''}
                            {d}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No history yet.</p>
          )}
        </Card>
      </div>

      {/* row 4 — graph */}
      <Card className="mt-4">
        <CardHead
          title="Competency graph"
          icon={Network}
          sub="Skill dependencies — a weak prerequisite (red) holds back everything downstream."
        />
        <CompetencyGraph profile={profile} highlight={weak.map((w) => w.id)} />
        <div className="mt-3">
          <Legend items={GRAPH_LEGEND} />
        </div>
      </Card>
    </div>
  )
}

// small inline icon so we don't add another import
function BarGroupIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="2" y1="4" x2="11" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="8" y2="12" />
    </svg>
  )
}
