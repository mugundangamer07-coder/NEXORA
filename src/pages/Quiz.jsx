import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle2, Flag, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppState.jsx'
import { labelFor } from '../data/competencyFramework.js'
import { Card, Pill } from '../components/ui.jsx'

export default function Quiz() {
  const { state, setLocal, submitAssessment } = useApp()
  const nav = useNavigate()
  const quiz = state.quiz
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState(state.answers || {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!quiz?.questions?.length) return <Navigate to="/upload" replace />

  const q = quiz.questions[i]
  const answered = Object.keys(answers).length
  const progress = Math.round((answered / quiz.questions.length) * 100)

  function choose(idx) {
    setAnswers((a) => ({ ...a, [q.id]: idx }))
  }

  async function submit() {
    setSaving(true)
    setError('')
    try {
      setLocal({ answers })
      await submitAssessment({
        documentName: state.documentName,
        source: quiz.source,
        questions: quiz.questions,
        answers,
        materialId: state.materialId,
      })
      nav('/results')
    } catch (e) {
      setSaving(false)
      setError(e.message || 'Could not save your assessment. Try again.')
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Assessment · {quiz.source === 'live' ? 'AI-generated' : 'sample bank'}</div>
          <h1 className="text-lg font-bold text-ink-900">
            Question {i + 1} <span className="text-slate-400">of {quiz.questions.length}</span>
          </h1>
        </div>
        <div className="text-right">
          <div className="label">Answered</div>
          <div className="font-bold">{answered}/{quiz.questions.length}</div>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>

      <Card className="mt-5">
        <div className="flex items-center gap-2">
          <Pill tone="blue">{labelFor(q.topic)}</Pill>
          <Pill tone="slate">{q.difficulty}</Pill>
          {q.subtopic && <span className="text-xs text-slate-400">{q.subtopic}</span>}
        </div>

        <p className="mt-4 text-[15px] font-semibold text-ink-900 leading-relaxed">{q.question}</p>

        <div className="mt-4 space-y-2">
          {q.options.map((opt, idx) => {
            const active = answers[q.id] === idx
            return (
              <button
                key={idx}
                onClick={() => choose(idx)}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition flex items-start gap-3 ${
                  active ? 'border-brand bg-brand-50 text-ink-900' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span
                  className={`mt-0.5 grid place-items-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0 ${
                    active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <button className="btn-ghost" disabled={i === 0} onClick={() => setI((v) => v - 1)}>
          <ChevronLeft size={16} /> Previous
        </button>

        {i < quiz.questions.length - 1 ? (
          <button className="btn-primary" onClick={() => setI((v) => v + 1)}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button
            className="btn-primary bg-teal-600 hover:bg-teal-700"
            onClick={submit}
            disabled={answered < quiz.questions.length || saving}
            title={answered < quiz.questions.length ? 'Answer every question to submit' : ''}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
            {saving ? 'Scoring…' : 'Submit assessment'}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
      {answered < quiz.questions.length && i === quiz.questions.length - 1 && (
        <p className="mt-3 text-xs text-amber-600 flex items-center gap-1">
          <CheckCircle2 size={13} /> Answer all {quiz.questions.length} questions to submit ({quiz.questions.length - answered} left).
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-1.5">
        {quiz.questions.map((qq, idx) => (
          <button
            key={qq.id}
            onClick={() => setI(idx)}
            className={`w-7 h-7 rounded-md text-xs font-bold ${
              idx === i
                ? 'bg-ink-900 text-white'
                : answers[qq.id] != null
                ? 'bg-brand-50 text-brand-700 border border-brand/30'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
