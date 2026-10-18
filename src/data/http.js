/** fetch wrapper with timeout and helpful errors. */
export class ApiError extends Error {
  constructor(message, { status, url } = {}) { super(message); this.status = status; this.url = url }
}
export async function getJSON(url, { timeout = 12000, headers } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers })
    if (!res.ok) {
      let detail = ''
      try { const j = await res.json(); detail = j['Error Message'] || j.message || j.error || '' } catch { /* ignore */ }
      throw new ApiError(detail || `Request failed (${res.status})`, { status: res.status, url })
    }
    return await res.json()
  } catch (e) {
    if (e.name === 'AbortError') throw new ApiError('Request timed out', { url })
    throw e
  } finally { clearTimeout(t) }
}
