import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2, WifiOff, RotateCw } from 'lucide-react'
import { useApp } from './context/AppState.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Landing from './pages/Landing.jsx'
import LearnerDashboard from './pages/LearnerDashboard.jsx'
import UploadPage from './pages/UploadPage.jsx'
import Quiz from './pages/Quiz.jsx'
import Results from './pages/Results.jsx'
import LearningPath from './pages/LearningPath.jsx'
import ManagerDashboard from './pages/ManagerDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center text-slate-400">
      <Loader2 className="animate-spin" />
    </div>
  )
}

function ServerUnreachable({ message }) {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="mx-auto grid place-items-center w-12 h-12 rounded-full bg-rose-50 text-rose-600">
          <WifiOff size={22} />
        </div>
        <h1 className="mt-4 text-lg font-bold text-ink-900">Can't reach the NEXORA server</h1>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        <p className="mt-1 text-xs text-slate-400">
          If the app was idle, the server may still be waking up — this can take up to a minute.
        </p>
        <button className="btn-primary mt-5" onClick={() => window.location.reload()}>
          <RotateCw size={15} /> Try again
        </button>
      </div>
    </div>
  )
}

// Where each role lands after login / on "/".
function homeFor(role) {
  if (role === 'admin') return '/admin'
  if (role === 'manager') return '/manager'
  return '/dashboard'
}

function RequireAuth({ roles, children }) {
  const { state } = useApp()
  const loc = useLocation()
  if (!state.authReady) return <Splash />
  if (!state.user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (!state.hydrated) return <Splash />
  if (roles && !roles.includes(state.user.role)) return <Navigate to={homeFor(state.user.role)} replace />
  return children
}

export default function App() {
  const { state } = useApp()
  if (state.bootError) return <ServerUnreachable message={state.bootError} />

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          !state.authReady ? (
            <Splash />
          ) : state.user ? (
            <Navigate to={homeFor(state.user.role)} replace />
          ) : (
            <Landing />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth roles={['learner']}>
            <Layout>
              <LearnerDashboard />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/upload"
        element={
          <RequireAuth roles={['learner']}>
            <Layout>
              <UploadPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/quiz"
        element={
          <RequireAuth roles={['learner']}>
            <Layout>
              <Quiz />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/results"
        element={
          <RequireAuth roles={['learner']}>
            <Layout>
              <Results />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/path"
        element={
          <RequireAuth roles={['learner']}>
            <Layout>
              <LearningPath />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/manager"
        element={
          <RequireAuth roles={['manager', 'admin']}>
            <Layout>
              <ManagerDashboard />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth roles={['admin']}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
