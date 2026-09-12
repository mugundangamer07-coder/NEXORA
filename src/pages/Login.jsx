import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Loader2, LogIn, UserPlus } from 'lucide-react'
import { useApp } from '../context/AppState.jsx'
import { BrandMark, Card } from '../components/ui.jsx'

const DEPARTMENTS = [
  'National Sample Survey Office',
  'Economic Statistics Division',
  'Social Statistics Division',
  'Price Statistics Division',
  'State Directorate of Economics & Statistics',
]

export default function Login() {
  const { state, login, register } = useApp()
  const nav = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [f, setF] = useState({
    email: '',
    password: '',
    name: '',
    role: 'learner',
    department: DEPARTMENTS[0],
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (state.authReady && state.user) {
    const home = state.user.role === 'admin' ? '/admin' : state.user.role === 'manager' ? '/manager' : '/dashboard'
    return <Navigate to={home} replace />
  }

  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res =
      mode === 'login'
        ? await login(f.email, f.password)
        : await register({
            email: f.email,
            password: f.password,
            name: f.name,
            role: f.role,
            department: f.role === 'manager' ? f.department : null,
          })
    setBusy(false)
    if (res.ok) nav('/', { replace: true }) // "/" redirects by role
    else setError(res.error || 'Something went wrong')
  }

  const DEMO_EMAILS = {
    learner: 'learner@nexora.gov.in',
    manager: 'manager@nexora.gov.in',
    admin: 'admin@nexora.gov.in',
  }
  function fillDemo(kind) {
    setMode('login')
    setF((s) => ({ ...s, email: DEMO_EMAILS[kind], password: 'demo1234' }))
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-ink-900 text-white p-12">
        <div className="flex items-center gap-2 font-extrabold text-lg">
          <BrandMark size={28} /> NEXORA
        </div>
        <div>
          <h1 className="text-3xl font-extrabold leading-tight max-w-md">From Learning Material to Measurable Competency</h1>
          <p className="mt-4 text-white/70 max-w-md text-sm">
            Sign in to build your competency profile, take AI-generated assessments, and get a personalized learning path
            that complements the iGOT Karmayogi ecosystem.
          </p>
        </div>
        <p className="text-xs text-white/40">Team Quest Coders · Smart India Hackathon · SIH26101</p>
      </div>

      {/* form */}
      <div className="flex items-center justify-center p-6 bg-slate-50">
        <Card className="w-full max-w-sm">
          <div className="flex items-center gap-2 lg:hidden mb-4 font-extrabold text-ink-900">
            <BrandMark size={24} /> NEXORA
          </div>
          <h2 className="text-lg font-bold text-ink-900">
            {mode === 'login' ? 'Sign in' : 'Create your account'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {mode === 'login' ? 'Welcome back.' : 'A few details to get started.'}
          </p>

          <form onSubmit={submit} className="mt-4 space-y-3">
            {mode === 'register' && (
              <Field label="Full name">
                <input className="inp" value={f.name} onChange={upd('name')} required minLength={2} />
              </Field>
            )}
            <Field label="Email">
              <input className="inp" type="email" value={f.email} onChange={upd('email')} required />
            </Field>
            <Field label="Password">
              <input
                className="inp"
                type="password"
                value={f.password}
                onChange={upd('password')}
                required
                minLength={6}
                placeholder={mode === 'register' ? 'at least 6 characters' : ''}
              />
            </Field>

            {mode === 'register' && (
              <>
                <Field label="I am a">
                  <select className="inp" value={f.role} onChange={upd('role')}>
                    <option value="learner">Learner / Statistical Officer</option>
                    <option value="manager">Training Manager / Nodal Officer</option>
                  </select>
                </Field>
                <p className="text-[11px] text-slate-400 -mt-2">
                  Admin accounts are provisioned separately and can't be self-registered.
                </p>
                {f.role === 'manager' && (
                  <Field label="Department">
                    <select className="inp" value={f.department} onChange={upd('department')}>
                      {DEPARTMENTS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </>
            )}

            {error && <div className="rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</div>}

            <button className="btn-primary w-full" disabled={busy}>
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'login' ? (
                <LogIn size={16} />
              ) : (
                <UserPlus size={16} />
              )}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-4 text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                No account?{' '}
                <button className="font-semibold text-brand-700" onClick={() => setMode('register')}>
                  Create one
                </button>
              </>
            ) : (
              <>
                Already registered?{' '}
                <button className="font-semibold text-brand-700" onClick={() => setMode('login')}>
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="label mb-2">Demo accounts</div>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1 text-xs" onClick={() => fillDemo('learner')}>
                Learner
              </button>
              <button type="button" className="btn-ghost flex-1 text-xs" onClick={() => fillDemo('manager')}>
                Manager
              </button>
              <button type="button" className="btn-ghost flex-1 text-xs" onClick={() => fillDemo('admin')}>
                Admin
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Password is prefilled — just press Sign in.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
