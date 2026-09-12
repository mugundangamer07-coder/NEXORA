import { motion } from 'framer-motion'

/* ---------------------------------------------------------------- brand mark */

export function BrandMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="nx" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#nx)" />
      {/* connected-nodes glyph = competency graph */}
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <line x1="9" y1="22" x2="9" y2="11" />
        <line x1="9" y1="11" x2="23" y2="21" />
        <line x1="23" y1="21" x2="23" y2="10" />
      </g>
      <g fill="#fff">
        <circle cx="9" cy="10" r="2.6" />
        <circle cx="23" cy="22" r="2.6" />
        <circle cx="23" cy="9" r="2.1" />
      </g>
    </svg>
  )
}

/* ---------------------------------------------------------------- containers */

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`card p-5 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function CardHead({ title, sub, icon: Icon, right }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-start gap-2.5">
        {Icon && (
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50 text-brand-700 shrink-0">
            <Icon size={16} />
          </span>
        )}
        <div>
          <h3 className="font-bold text-ink-900 leading-tight">{title}</h3>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

export function SectionTitle({ children, sub, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 className="text-xl font-extrabold tracking-tight text-ink-900">{children}</h2>
        {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/* ---------------------------------------------------------------- badges */

const TONE_BG = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-brand-50 text-brand-700',
  accent: 'bg-accent-50 text-accent-700',
  strong: 'bg-teal-50 text-teal-700',
  moderate: 'bg-amber-50 text-amber-700',
  gap: 'bg-rose-50 text-rose-700',
}

export function Pill({ children, tone = 'slate', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_BG[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function BandBadge({ band }) {
  const map = {
    strong: { tone: 'strong', label: 'Strong' },
    moderate: { tone: 'moderate', label: 'Moderate' },
    gap: { tone: 'gap', label: 'Competency Gap' },
  }
  const b = map[band] || map.moderate
  return <Pill tone={b.tone}>{b.label}</Pill>
}

const BAND_HEX = { strong: '#0d9488', moderate: '#d97706', gap: '#e11d48', none: '#cbd5e1' }
export function bandHex(band) {
  return BAND_HEX[band] || BAND_HEX.none
}
export function Dot({ band, size = 8 }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: bandHex(band) }}
    />
  )
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- stats */

const TILE_TEXT = {
  ink: 'text-ink-900',
  brand: 'text-brand-700',
  accent: 'text-accent-700',
  strong: 'text-teal-600',
  moderate: 'text-amber-600',
  gap: 'text-rose-600',
}
const TILE_CHIP = {
  ink: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-50 text-brand-700',
  accent: 'bg-accent-50 text-accent-700',
  strong: 'bg-teal-50 text-teal-700',
  moderate: 'bg-amber-50 text-amber-700',
  gap: 'bg-rose-50 text-rose-700',
}

// simple stat (no icon) — kept for Results page
export function StatCard({ label, value, hint, tone = 'ink' }) {
  return (
    <Card>
      <div className="label">{label}</div>
      <div className={`stat-num mt-1 ${TILE_TEXT[tone] || TILE_TEXT.ink}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </Card>
  )
}

export function StatTile({ icon: Icon, label, value, hint, tone = 'ink', delta }) {
  const up = typeof delta === 'number' && delta > 0
  const down = typeof delta === 'number' && delta < 0
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {Icon && (
          <span className={`grid place-items-center w-8 h-8 rounded-lg ${TILE_CHIP[tone]}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`stat-num ${TILE_TEXT[tone]}`}>{value}</span>
        {typeof delta === 'number' && delta !== 0 && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              up ? 'bg-teal-50 text-teal-700' : down ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {up ? '+' : ''}
            {delta}
          </span>
        )}
      </div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </Card>
  )
}

/* ---------------------------------------------------------------- ring */

export function ProgressRing({ value = 0, size = 148, stroke = 13, tone, caption = 'COMPETENCY' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c
  const color = tone || (value >= 75 ? '#0d9488' : value >= 50 ? '#d97706' : '#e11d48')
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: off }}
        transition={{ duration: 1, ease: 'easeOut' }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="49%"
        textAnchor="middle"
        className="fill-ink-900"
        style={{ fontSize: size * 0.24, fontWeight: 800 }}
      >
        {Math.round(value)}%
      </text>
      <text
        x="50%"
        y="65%"
        textAnchor="middle"
        className="fill-slate-400"
        style={{ fontSize: size * 0.093, fontWeight: 700, letterSpacing: 1 }}
      >
        {caption}
      </text>
    </svg>
  )
}

/* ---------------------------------------------------------------- bars */

export function TopicBar({ label, pct, band, showDot = false, sub }) {
  const color = bandHex(band)
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-ink-900">
          {showDot && <Dot band={band} />}
          {label}
        </span>
        <span className="tabular-nums text-slate-500">{pct}%</span>
      </div>
      <div className="mt-1.5 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

/* ---------------------------------------------------------------- sparkline */

export function Sparkline({ points = [], width = 132, height = 40, color = '#2563EB' }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const stepX = width / (points.length - 1)
  const xy = points.map((p, i) => [i * stepX, height - 4 - ((p - min) / span) * (height - 8)])
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const [lx, ly] = xy[xy.length - 1]
  return (
    <svg width={width} height={height} className="shrink-0">
      <path d={area} fill={color} opacity="0.10" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill={color} />
    </svg>
  )
}

/* ---------------------------------------------------------------- motion */

export function Fade({ children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      {children}
    </motion.div>
  )
}

export function Stagger({ children, className = '', step = 0.06 }) {
  const arr = Array.isArray(children) ? children : [children]
  return (
    <div className={className}>
      {arr.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * step, ease: 'easeOut' }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}
