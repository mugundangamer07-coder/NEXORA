import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Upload, ScanSearch, ListChecks, Target, Route as RouteIcon, Building2, ShieldCheck,
  TrendingUp, ChevronRight, ChevronDown, PlayCircle, Loader2,
} from 'lucide-react'
import { useApp } from '../context/AppState.jsx'

const features = [
  { icon: ScanSearch, title: 'AI material analysis', desc: 'Upload a PDF and the AI maps its topics, subtopics, key concepts and difficulty level.' },
  { icon: ListChecks, title: 'AI-generated assessments', desc: 'High-quality MCQs with explanations, topic tags and difficulty — 5, 10 or 20 questions.' },
  { icon: Target, title: 'Explainable competency gaps', desc: 'Topic-by-topic diagnosis that tells you not just your score, but exactly why a gap exists.' },
  { icon: RouteIcon, title: 'Personalized learning path', desc: 'An ordered roadmap built from your gaps and the competency dependency graph.' },
  { icon: Building2, title: 'Organizational insight', desc: 'Training managers see department-wide competency gaps to plan capacity building.' },
  { icon: ShieldCheck, title: 'iGOT Karmayogi ready', desc: 'Recommendation layer designed to plug into the iGOT Karmayogi training ecosystem.' },
]

const CYCLE = [
  { label: 'UPLOAD', icon: Upload, desc: 'Add a learning PDF' },
  { label: 'ANALYZE', icon: ScanSearch, desc: 'AI extracts topics' },
  { label: 'ASSESS', icon: ListChecks, desc: 'AI-generated quiz' },
  { label: 'IDENTIFY', icon: Target, desc: 'Competency gaps found' },
  { label: 'PERSONALIZE', icon: RouteIcon, desc: 'Tailored learning path' },
  { label: 'IMPROVE', icon: TrendingUp, desc: 'Re-assess & track growth' },
]

function CycleDiagram() {
  return (
    <div className="mt-10 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-1">
      {CYCLE.map((step, i) => (
        <div key={step.label} className="flex flex-col sm:flex-row items-center">
          <div className="flex flex-col items-center text-center w-36 py-2">
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-white/10 border border-white/15 text-accent-100">
              <step.icon size={22} />
            </div>
            <div className="mt-2.5 text-xs font-extrabold tracking-wider text-white">{step.label}</div>
            <div className="text-[11px] text-white/50 mt-0.5">{step.desc}</div>
          </div>
          {i < CYCLE.length - 1 && (
            <div className="text-white/25 shrink-0">
              <ChevronDown size={18} className="sm:hidden" />
              <ChevronRight size={18} className="hidden sm:block" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function Landing() {
  const { login } = useApp()
  const nav = useNavigate()
  const [demoBusy, setDemoBusy] = useState(false)

  async function viewDemo() {
    setDemoBusy(true)
    const res = await login('learner@nexora.gov.in', 'demo1234')
    setDemoBusy(false)
    if (res.ok) nav('/dashboard')
  }

  return (
    <div>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              Capacity building for India's Official Statistical System
            </span>
            <h1 className="mt-5 text-4xl md:text-5xl font-extrabold leading-tight max-w-3xl">NEXORA</h1>
            <p className="mt-2 text-accent-100 font-semibold tracking-wide text-sm uppercase">
              From Learning Material to Measurable Competency
            </p>
            <p className="mt-5 text-white/70 text-lg max-w-2xl">
              AI-powered competency intelligence that transforms learning material into personalized training paths —
              built to complement the iGOT Karmayogi ecosystem, not replace it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/upload" className="btn-primary text-base px-5 py-3">
                <Upload size={18} /> Try NEXORA
              </Link>
              <button
                type="button"
                onClick={viewDemo}
                disabled={demoBusy}
                className="btn-ghost text-base px-5 py-3 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                {demoBusy ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
                View Demo
              </button>
            </div>
          </motion.div>

          <CycleDiagram />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">The core solution</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="card p-5"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
            >
              <div className="grid place-items-center w-10 h-10 rounded-lg bg-brand-50 text-brand-700">
                <f.icon size={20} />
              </div>
              <h3 className="mt-3 font-bold text-ink-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-xs text-slate-400 text-center">
            This prototype runs the full pipeline end to end. Topic extraction and question generation use Google Gemini
            when an API key is configured, with a bundled offline sample so the demo always works.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h2 className="text-2xl font-extrabold text-ink-900">Ready to see your competency map?</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/upload" className="btn-primary text-base px-6 py-3">
            <Upload size={18} /> Try NEXORA
          </Link>
          <button type="button" onClick={viewDemo} disabled={demoBusy} className="btn-ghost text-base px-6 py-3">
            {demoBusy ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
            View Demo
          </button>
        </div>
        <p className="mt-10 text-xs text-slate-400">
          NEXORA · Team Quest Coders · Smart India Hackathon (SIH26101) · Built to complement, not replace, iGOT Karmayogi.
        </p>
      </section>
    </div>
  )
}
