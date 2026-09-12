import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch, getToken, setToken } from '../lib/api.js'
import { setLiveAI } from '../lib/gemini.js'

const AppStateContext = createContext(null)

// transient = client-only journey state (not persisted anywhere)
const transient = {
  documentName: null,
  materialId: null, // the persisted materials.id once the file is uploaded
  topicMap: null,
  quiz: null, // { questions, count, source }
  answers: {},
}
// server = mirrors the backend for this user
const serverState = {
  result: null,
  profile: {},
  history: [],
  learningPath: null,
  recommendations: null,
}
const loggedOut = {
  authReady: false, // finished checking the stored token
  hydrated: false, // finished the first /assessments/state fetch (or no user)
  user: null,
  liveAI: false,
  ...transient,
  ...serverState,
}

export function AppStateProvider({ children }) {
  const [state, setState] = useState(loggedOut)
  const patch = useCallback((p) => setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })), [])

  const applyServerState = useCallback(
    (d) =>
      patch({
        result: d.result ?? null,
        profile: d.profile ?? {},
        history: d.history ?? [],
        learningPath: d.learningPath ?? null,
        recommendations: d.recommendations ?? null,
      }),
    [patch],
  )

  const refreshState = useCallback(async () => {
    const d = await apiFetch('/assessments/state')
    applyServerState(d)
    return d
  }, [applyServerState])

  // on load: verify token, hydrate
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!getToken()) {
        patch({ authReady: true, hydrated: true })
        return
      }
      try {
        const { user, liveAI } = await apiFetch('/auth/me')
        if (!alive) return
        setLiveAI(liveAI)
        patch({ user, liveAI, authReady: true })
        await refreshState()
        if (alive) patch({ hydrated: true })
      } catch {
        setToken(null)
        if (alive) patch({ ...loggedOut, authReady: true, hydrated: true })
      }
    })()
    return () => {
      alive = false
    }
  }, [patch, refreshState])

  const finishAuth = useCallback(
    async ({ token, user, liveAI }) => {
      setToken(token)
      setLiveAI(liveAI)
      patch({ ...loggedOut, authReady: true, user, liveAI })
      await refreshState()
      patch({ hydrated: true })
    },
    [patch, refreshState],
  )

  const login = useCallback(
    async (email, password) => {
      try {
        const d = await apiFetch('/auth/login', { method: 'POST', auth: false, body: { email, password } })
        await finishAuth(d)
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e.message }
      }
    },
    [finishAuth],
  )

  const register = useCallback(
    async (form) => {
      try {
        const d = await apiFetch('/auth/register', { method: 'POST', auth: false, body: form })
        await finishAuth(d)
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e.message }
      }
    },
    [finishAuth],
  )

  const logout = useCallback(() => {
    setToken(null)
    setLiveAI(false)
    setState({ ...loggedOut, authReady: true, hydrated: true })
  }, [])

  const submitAssessment = useCallback(
    async ({ documentName, source, questions, answers, materialId }) => {
      const d = await apiFetch('/assessments', {
        method: 'POST',
        body: { documentName, source, questions, answers, materialId },
      })
      applyServerState(d)
      return d
    },
    [applyServerState],
  )

  const resetJourney = useCallback(() => patch({ ...transient }), [patch])

  const api = useMemo(
    () => ({
      state,
      setLocal: patch, // transient journey fields (documentName, topicMap, quiz, answers)
      resetJourney,
      login,
      register,
      logout,
      refreshState,
      submitAssessment,
    }),
    [state, patch, resetJourney, login, register, logout, refreshState, submitAssessment],
  )

  return <AppStateContext.Provider value={api}>{children}</AppStateContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider')
  return ctx
}
