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
  bootError: null, // couldn't verify the stored session because the server was unreachable
  syncError: null, // signed in, but loading this user's data failed
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
    patch({ syncError: null })
    return d
  }, [applyServerState, patch])

  // A failed data load must still end hydration, or route guards spin forever.
  const hydrate = useCallback(async () => {
    try {
      await refreshState()
    } catch (e) {
      patch({ syncError: e.message })
    }
    patch({ hydrated: true })
  }, [refreshState, patch])

  // on load: verify token, hydrate
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!getToken()) {
        patch({ authReady: true, hydrated: true })
        return
      }
      let me
      try {
        me = await apiFetch('/auth/me')
      } catch (e) {
        if (!alive) return
        // Only a rejected token means "signed out"; a sleeping server doesn't.
        if (e.status === 401 || e.status === 404) {
          setToken(null)
          patch({ ...loggedOut, authReady: true, hydrated: true })
        } else {
          patch({ authReady: true, hydrated: true, bootError: e.message })
        }
        return
      }
      if (!alive) return
      setLiveAI(me.liveAI)
      patch({ user: me.user, liveAI: me.liveAI, authReady: true })
      await hydrate()
    })()
    return () => {
      alive = false
    }
  }, [patch, hydrate])

  const finishAuth = useCallback(
    async ({ token, user, liveAI }) => {
      setToken(token)
      setLiveAI(liveAI)
      patch({ ...loggedOut, authReady: true, user, liveAI })
      await hydrate()
    },
    [patch, hydrate],
  )

  const login = useCallback(
    async (email, password) => {
      try {
        const d = await apiFetch('/auth/login', { method: 'POST', auth: false, retry: true, body: { email, password } })
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
