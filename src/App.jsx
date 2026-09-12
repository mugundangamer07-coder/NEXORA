import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useApp } from './context/AppState.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Landing from './pages/Landing.jsx'
import LearnerDashboard from './pages/LearnerDashboard.jsx'
import UploadPage from './pages/UploadPage.jsx'
import Quiz from './pages/Quiz.jsx'
import Results from './pages/Results.jsx'
import LearningPath from './pages/LearningPath.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center text-slate-400">
      <Loader2 className="animate-spin" />
    </div>
  )
}

function RequireAuth({ role, children }) {
  const { state } = useApp()
  const loc = useLocation()
  if (!state.authReady) return <Splash />
  if (!state.user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (!state.hydrated) return <Splash />
  if (role && state.user.role !== role) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const { state } = useApp()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          !state.authReady ? (
            <Splash />
          ) : state.user ? (
            <Navigate to={state.user.role === 'officer' ? '/admin' : '/dashboard'} replace />
          ) : (
            <Landing />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Layout>
              <LearnerDashboard />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/upload"
        element={
          <RequireAuth>
            <Layout>
              <UploadPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/quiz"
        element={
          <RequireAuth>
            <Layout>
              <Quiz />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/results"
        element={
          <RequireAuth>
            <Layout>
              <Results />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/path"
        element={
          <RequireAuth>
            <Layout>
              <LearningPath />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth role="officer">
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
