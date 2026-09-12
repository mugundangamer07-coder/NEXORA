import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Upload, BarChart3, GraduationCap, Building2, ShieldCheck, Sparkles, LogOut } from 'lucide-react'
import { useApp } from '../context/AppState.jsx'
import { BrandMark } from './ui.jsx'

const learnerNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload & Analyze', icon: Upload },
  { to: '/results', label: 'Results', icon: BarChart3 },
  { to: '/path', label: 'Learning Path', icon: GraduationCap },
]
const managerNav = [{ to: '/manager', label: 'Org Dashboard', icon: Building2 }]
const adminNav = [
  { to: '/admin', label: 'Admin', icon: ShieldCheck },
  { to: '/manager', label: 'Org Dashboard', icon: Building2 },
]
const NAV_BY_ROLE = { learner: learnerNav, manager: managerNav, admin: adminNav }
const ROLE_LABEL = { learner: 'Learner', manager: 'Training Manager', admin: 'Admin' }

export default function Layout({ children }) {
  const { state, logout } = useApp()
  const nav = useNavigate()
  const items = NAV_BY_ROLE[state.user?.role] || learnerNav

  function doLogout() {
    logout()
    nav('/login', { replace: true })
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 bg-ink-900 text-white">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 font-extrabold tracking-tight text-[15px]">
            <BrandMark size={26} />
            NEXORA
          </NavLink>
          <span className="hidden lg:block text-[11px] text-white/50 border-l border-white/20 pl-3">
            AI-Powered Learning Intelligence · Official Statistical System
          </span>

          <nav className="ml-2 hidden sm:flex items-center gap-1">
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <n.icon size={15} />
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span
              className={`hidden md:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${
                state.liveAI ? 'bg-teal-500/20 text-teal-300' : 'bg-white/10 text-white/60'
              }`}
              title={state.liveAI ? 'Live Gemini AI enabled on the server' : 'Server running on the bundled offline sample'}
            >
              <Sparkles size={12} />
              {state.liveAI ? 'Live AI' : 'Offline demo'}
            </span>

            {state.user && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right leading-tight">
                  <div className="text-xs font-semibold">{state.user.name}</div>
                  <div className="text-[10px] text-white/50 capitalize">
                    {ROLE_LABEL[state.user.role] || state.user.role}
                  </div>
                </div>
                <button
                  onClick={doLogout}
                  title="Sign out"
                  className="grid place-items-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-xs text-slate-400">
        NEXORA · Prototype for Smart India Hackathon (SIH26101) · Recommendations shown from a demo catalogue modelled on
        the iGOT Karmayogi ecosystem (integration-ready, not a live government API).
      </footer>
    </div>
  )
}
