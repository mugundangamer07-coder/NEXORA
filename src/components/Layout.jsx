import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Upload, BarChart3, GraduationCap, Building2, ShieldCheck, Sparkles, LogOut, Menu, X } from 'lucide-react'
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
// Seeded demo/cohort accounts all live on these two domains — a real
// self-registered account never does, so this is a safe way to flag them.
const isDemoAccount = (email) => /@nexora\.(gov\.in|demo)$/i.test(email || '')

export default function Layout({ children }) {
  const { state, logout } = useApp()
  const nav = useNavigate()
  const loc = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const items = NAV_BY_ROLE[state.user?.role] || learnerNav

  function doLogout() {
    logout()
    nav('/login', { replace: true })
  }

  // Close the mobile menu automatically whenever the route changes.
  useEffect(() => setMenuOpen(false), [loc.pathname])

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

            {isDemoAccount(state.user?.email) && (
              <span
                className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-accent-100/20 text-accent-100"
                title="You're viewing seeded demo data, not a real officer's record"
              >
                Demo data
              </span>
            )}

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
                  className="hidden sm:grid place-items-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80"
                >
                  <LogOut size={15} />
                </button>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Menu"
                  aria-expanded={menuOpen}
                  className="grid sm:hidden place-items-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  {menuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* mobile menu panel */}
        {state.user && menuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-ink-900 px-4 py-3">
            <div className="flex items-center justify-between pb-3 mb-1 border-b border-white/10">
              <div>
                <div className="text-sm font-semibold">{state.user.name}</div>
                <div className="text-[11px] text-white/50 capitalize">{ROLE_LABEL[state.user.role] || state.user.role}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${
                    state.liveAI ? 'bg-teal-500/20 text-teal-300' : 'bg-white/10 text-white/60'
                  }`}
                >
                  <Sparkles size={10} />
                  {state.liveAI ? 'Live AI' : 'Offline demo'}
                </span>
                {isDemoAccount(state.user.email) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-accent-100/20 text-accent-100">
                    Demo data
                  </span>
                )}
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <n.icon size={16} />
                  {n.label}
                </NavLink>
              ))}
              <button
                onClick={doLogout}
                className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-300 hover:bg-white/10 text-left"
              >
                <LogOut size={16} /> Sign out
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-xs text-slate-400">
        NEXORA · Prototype for Smart India Hackathon (SIH26101) · Recommendations shown from a demo catalogue modelled on
        the iGOT Karmayogi ecosystem (integration-ready, not a live government API).
      </footer>
    </div>
  )
}
