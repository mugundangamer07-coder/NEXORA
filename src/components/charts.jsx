import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line,
} from 'recharts'
import { bandHex } from './ui.jsx'

const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 16px rgba(11,36,71,0.10)',
    fontSize: 12,
    padding: '6px 10px',
  },
  labelStyle: { fontWeight: 700, color: '#0B2447', marginBottom: 2 },
}

// Horizontal bar chart of per-competency scores, colored by band — the
// "Sampling 85%, Survey Design 72%..." view from the product spec.
export function CompetencyBarChart({ rows, height }) {
  if (!rows?.length) return null
  const h = height || Math.max(160, rows.length * 34)
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={128}
          tick={{ fontSize: 12, fill: '#0B2447', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Competency']} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={16}>
          {rows.map((r) => (
            <Cell key={r.id} fill={bandHex(r.band)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Line chart of overall competency across every assessment attempt.
export function ProgressLineChart({ history, height = 200 }) {
  if (!history?.length) return null
  const data = history.map((h) => ({
    label: new Date(h.takenAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    overall: h.overall,
  }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} width={36} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Overall competency']} />
        <Line
          type="monotone"
          dataKey="overall"
          stroke="#4f46e5"
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: '#4f46e5', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
