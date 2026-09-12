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

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'content-type': 'application/json' }
  const tok = getToken()
  if (auth && tok) headers.authorization = `Bearer ${tok}`

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  let data = {}
  try {
    data = await res.json()
  } catch {}

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}
