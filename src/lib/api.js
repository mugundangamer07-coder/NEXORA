// Thin client for the NEXORA backend. All calls go through /api (Vite proxies
// this to the Express server in dev; same-origin in production).

const TOKEN_KEY = 'nexora.token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

// Free-tier hosts sleep or cold-start, so the first request after a pause can
// fail with a network error or a gateway 5xx. Safe-to-repeat calls retry.
const RETRY_DELAYS_MS = [700, 1800, 4000]
const isTransient = (status) => status >= 500
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchWithRetry(url, init, retry) {
  for (let attempt = 0; ; attempt++) {
    const last = !retry || attempt >= RETRY_DELAYS_MS.length
    try {
      const res = await fetch(url, init)
      if (last || !isTransient(res.status)) return res
    } catch (e) {
      if (last) {
        const err = new Error('Could not reach the NEXORA server. Check your connection and try again.')
        err.status = 0
        throw err
      }
    }
    await sleep(RETRY_DELAYS_MS[attempt])
  }
}

export async function apiFetch(path, { method = 'GET', body, auth = true, retry = method === 'GET' } = {}) {
  const headers = { 'content-type': 'application/json' }
  const tok = getToken()
  if (auth && tok) headers.authorization = `Bearer ${tok}`

  const res = await fetchWithRetry(
    `/api${path}`,
    { method, headers, body: body === undefined ? undefined : JSON.stringify(body) },
    retry,
  )

  let data = {}
  try {
    data = await res.json()
  } catch {}

  if (!res.ok) {
    const fallback = isTransient(res.status)
      ? `The server isn't responding right now (HTTP ${res.status}). Please try again in a moment.`
      : `Request failed (${res.status})`
    const err = new Error(data.error || fallback)
    err.status = res.status
    throw err
  }
  return data
}

// Multipart upload (real file, validated server-side too) — used for /api/materials/upload.
export async function apiUpload(path, file) {
  const form = new FormData()
  form.append('file', file)
  const headers = {}
  const tok = getToken()
  if (tok) headers.authorization = `Bearer ${tok}`

  const res = await fetch(`/api${path}`, { method: 'POST', headers, body: form })
  let data = {}
  try {
    data = await res.json()
  } catch {}
  if (!res.ok) {
    const err = new Error(data.error || `Upload failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}
