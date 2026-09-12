import { useEffect, useState } from 'react'
import { Users, Gauge, GraduationCap, TriangleAlert, Building2, AlertOctagon, ListChecks, Loader2 } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { bandFor } from '../lib/scoring.js'
import { Card, CardHead, SectionTitle, StatTile, Pill, Dot, Legend, bandHex } from '../components/ui.jsx'

const DEPT_SHORT = {
  'National Sample Survey Office': 'NSS Office',
  'Economic Statistics Division': 'Economic Statistics',
  'Social Statistics Division': 'Social Statistics',
  'Price Statistics Division': 'Price Statistics',
  'State Directorate of Economics & Statistics': 'State DES',
}
const short = (d) => DEPT_SHORT[d] || d

const LEGEND = [
  { label: 'Strong (75%+)', color: bandHex('strong') },
  { label: 'Moderate (50–74%)', color: bandHex('moderate') },
  { label: 'At risk (<50%)', color: bandHex('gap') },
]

const bandKey = (v) => (v >= 75 ? 'strong' : v >= 50 ? 'moderate' : 'gap')

function RankBar({ rank, label, value, band, note }) {
  return (
    <div className="flex items-center gap-3 py-2 min-w-0">
      <span className="w-5 shrink-0 text-xs font-bold text-slate-400 tabular-nums text-right">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 font-medium text-ink-900 truncate min-w-0">
            <Dot band={band} /> <span className="truncate">{label}</span>
          </span>
          <span className="tabular-nums text-slate-500 shrink-0">
            {value}%{note ? <span className="text-slate-400"> · {note}</span> : null}
          </span>
        </div>
        <div className="mt-1.5 h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: bandHex(band) }} />
        </div>
      </div>
    </div>
  )
}

// The Training Manager's view: organization-wide competency intelligence,
// aggregated live from every learner's real profile (server/routes/analytics.js).
export default function ManagerDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    apiFetch('/analytics/org')
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  if (error) {
    return (
      <div>
        <SectionTitle>Training Manager Dashboard</SectionTitle>
        <Card className="text-sm text-rose-600">Could not load organization analytics: {error}</Card>
      </div>
    )
  }
  if (!data) {
    return (
      <div>
        <SectionTitle>Training Manager Dashboard</SectionTitle>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading organization analytics…
        </div>
      </div>
    )
  }

  const byGap = [...data.topics].sort((a, b) => b.gapPct - a.gapPct)
  const byScore = [...data.topics].sort((a, b) => a.avg - b.avg)

  return (
    <div>
      <SectionTitle
        sub="Organizational competency intelligence — live aggregates across every learner account."
        right={<Pill tone="slate">{data.learnerCount} learners</Pill>}
      >
        Training Manager Dashboard
      </SectionTitle>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="Learners" value={data.learnerCount} hint="with a competency profile" tone="brand" />
        <StatTile
          icon={Gauge}
          label="Avg competency"
          value={`${data.avgOverall}%`}
          tone={bandFor(data.avgOverall).key}
          hint="mean across all learners"
        />
        <StatTile
          icon={GraduationCap}
          label="Training completion"
          value={`${data.avgCompletion}%`}
          tone="moderate"
          hint="estimated from activity"
        />
        <StatTile
          icon={TriangleAlert}
          label="At-risk topics"
          value={data.atRiskTopics}
          tone="gap"
          hint="org avg below 62%"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead
            title="Most common competency gaps"
            icon={AlertOctagon}
            sub="Share of learners scoring below 50% on each topic"
          />
          {byGap.slice(0, 6).map((t, i) => (
            <RankBar key={t.id} rank={i + 1} label={t.label} value={t.gapPct} band={bandKey(100 - t.gapPct)} />
          ))}
        </Card>

        <Card>
          <CardHead
            title="Organization competency by topic"
            icon={ListChecks}
            sub={`Mean score across all ${data.learnerCount} learners · lowest first`}
          />
          {byScore.map((t, i) => (
            <RankBar key={t.id} rank={i + 1} label={t.label} value={t.avg} band={bandKey(t.avg)} />
          ))}
        </Card>
      </div>

      <div className="mt-3">
        <Legend items={LEGEND} />
      </div>

      <Card className="mt-4">
        <CardHead title="Department-wise performance" icon={Building2} sub="Mean competency by department, best first" />
        {data.departments.map((d, i) => (
          <RankBar
            key={d.department}
            rank={i + 1}
            label={short(d.department)}
            value={d.avg}
            band={bandKey(d.avg)}
            note={`${d.n} learners`}
          />
        ))}
      </Card>

      <Card className="mt-4">
        <CardHead
          title="Learner roster"
          icon={Users}
          right={<Pill tone="slate">weakest learners first</Pill>}
        />
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100">
                <th className="py-2 pr-4 font-semibold">Learner</th>
                <th className="py-2 pr-4 font-semibold">Department</th>
                <th className="py-2 pr-4 font-semibold">Competency</th>
                <th className="py-2 pr-4 font-semibold">Weakest topic</th>
                <th className="py-2 pr-4 font-semibold">Assessments</th>
                <th className="py-2 pr-4 font-semibold">Training</th>
              </tr>
            </thead>
            <tbody>
              {data.roster.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-ink-900">{l.name}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{short(l.department)}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className="inline-flex items-center gap-1.5 font-bold"
                      style={{ color: bandHex(bandKey(l.overall)) }}
                    >
                      <Dot band={bandKey(l.overall)} /> {l.overall}%
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500">
                    {l.weakest.label} <span className="text-slate-400">({l.weakest.value}%)</span>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500 tabular-nums">{l.assessments}</td>
                  <td className="py-2.5 pr-4 text-slate-500 tabular-nums">{l.trainingCompletion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-3">
            Showing {data.roster.length} of {data.learnerCount} learners.
          </p>
        </div>
      </Card>
    </div>
  )
}
