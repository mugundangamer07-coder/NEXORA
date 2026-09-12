import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, Loader2, ScanSearch, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppState.jsx'
import { extractPdfText } from '../lib/pdf.js'
import { analyzeDocument, generateQuiz, hasLiveAI } from '../lib/gemini.js'
import { SAMPLE_DOCUMENT } from '../data/sampleAnalysis.js'
import { Card, SectionTitle, Pill, Fade } from '../components/ui.jsx'

const STAGES = {
  idle: '',
  reading: 'Extracting text from the document…',
  analyzing: 'AI is analyzing your learning material…',
  generating: 'AI is generating your assessment…',
}

export default function UploadPage() {
  const { state, setLocal, resetJourney } = useApp()
  const nav = useNavigate()
  const [stage, setStage] = useState('idle')
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [count, setCount] = useState(10)
  const topicMap = state.topicMap

  async function handleFile(file) {
    if (!file) return
    setError('')
    resetJourney()
    setFileName(file.name)
    try {
      setStage('reading')
      const { text: raw } = await extractPdfText(file)
      if (raw.length < 200) {
        setError('Could not read enough text from this PDF (it may be scanned images). Try another file or use the sample.')
        setStage('idle')
        return
      }
      setText(raw)
      setStage('analyzing')
      const map = await analyzeDocument(raw, file.name)
      setLocal({ documentName: file.name, topicMap: map })
      setStage('idle')
    } catch (e) {
      console.error(e)
      setError('Something went wrong reading that PDF. Try another file or load the sample document.')
      setStage('idle')
    }
  }

  async function useSample() {
    setError('')
    resetJourney()
    setFileName(SAMPLE_DOCUMENT.name)
    setText('')
    setStage('analyzing')
    const map = await analyzeDocument('', SAMPLE_DOCUMENT.name)
    setLocal({ documentName: SAMPLE_DOCUMENT.name, topicMap: map })
    setStage('idle')
  }

  async function makeQuiz() {
    setStage('generating')
    setError('')
    try {
      const { questions, source } = await generateQuiz(text, count, topicMap)
      if (!questions.length) {
        setError('Question generation returned nothing. Try the sample document.')
        setStage('idle')
        return
      }
      setLocal({ quiz: { questions, count: questions.length, source }, answers: {} })
      nav('/quiz')
    } catch (e) {
      console.error(e)
      setError('Could not generate the quiz. Try again or use the sample.')
      setStage('idle')
    }
  }

  const busy = stage !== 'idle'

  return (
    <div className="max-w-4xl">
      <SectionTitle sub="Upload a learning document. The AI maps its topics, then generates a tagged assessment.">
        Upload & Analyze Learning Material
      </SectionTitle>

      <Card>
        <label
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition ${
            busy ? 'opacity-60 pointer-events-none' : 'border-slate-300 hover:border-brand hover:bg-brand-50/40'
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Upload className="text-brand" size={28} />
          <div className="mt-3 font-semibold text-ink-900">Drop a PDF here or click to browse</div>
          <div className="text-xs text-slate-500 mt-1">PDF only for this prototype · up to ~40 pages read</div>
        </label>

        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <button className="btn-ghost" onClick={useSample} disabled={busy}>
            <FileText size={16} /> Use bundled sample document
          </button>
          <span className="text-xs text-slate-400">
            {hasLiveAI() ? 'Live AI enabled (Gemini)' : 'Offline demo mode — using bundled sample analysis'}
          </span>
        </div>

        {busy && (
          <div className="mt-5 flex items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 text-brand-700 text-sm font-medium">
            <Loader2 className="animate-spin" size={18} /> {STAGES[stage]}
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-rose-700 text-sm">{error}</div>
        )}
      </Card>

      {topicMap && !busy && (
        <Fade>
          <Card className="mt-6">
            <div className="flex items-center gap-2">
              <ScanSearch className="text-brand" size={18} />
              <h3 className="font-bold text-ink-900">AI analysis of “{topicMap.documentName}”</h3>
              <Pill tone={topicMap.source === 'live' ? 'strong' : 'slate'}>
                {topicMap.source === 'live' ? 'Generated live' : 'Bundled sample'}
              </Pill>
            </div>
            {topicMap.summary && <p className="mt-2 text-sm text-slate-600">{topicMap.summary}</p>}
            <div className="mt-2 text-sm">
              <span className="label">Overall difficulty</span>{' '}
              <span className="font-semibold">{topicMap.overallDifficulty}</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {topicMap.topics.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-ink-900">{t.label}</div>
                    <Pill tone="blue">{t.difficulty}</Pill>
                  </div>
                  {t.subtopics?.length > 0 && (
                    <div className="mt-2">
                      <div className="label">Subtopics</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {t.subtopics.map((s) => (
                          <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {t.concepts?.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      <span className="label">Key concepts:</span> {t.concepts.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3 flex-wrap border-t border-slate-100 pt-4">
              <span className="label">Assessment length</span>
              <div className="flex rounded-lg border border-slate-200 p-0.5">
                {[5, 10, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md ${
                      count === n ? 'bg-brand text-white' : 'text-slate-600'
                    }`}
                  >
                    {n} questions
                  </button>
                ))}
              </div>
              <button className="btn-primary ml-auto" onClick={makeQuiz}>
                Generate quiz <ArrowRight size={16} />
              </button>
            </div>
          </Card>
        </Fade>
      )}
    </div>
  )
}
