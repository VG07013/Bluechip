/**
 * Tiny TTL cache: memory first, localStorage second, with in-flight request de-duplication
 * and a concurrency limiter. Every data module routes through `cached()` so we stay inside
 * free-tier rate limits.
 */
const mem = new Map()
const inflight = new Map()
const PREFIX = 'bluechip:cache:'

function readStorage(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { v, exp } = JSON.parse(raw)
    if (Date.now() > exp) { localStorage.removeItem(PREFIX + key); return null }
    return { v, exp }
  } catch { return null }
}
function writeStorage(key, v, exp) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ v, exp })) } catch { /* quota exceeded: ignore */ }
}

export function getCached(key) {
  const m = mem.get(key)
  if (m && Date.now() < m.exp) return m.v
  const s = readStorage(key)
  if (s) { mem.set(key, s); return s.v }
  return undefined
}

export function setCached(key, v, ttl) {
  const exp = Date.now() + ttl
  mem.set(key, { v, exp })
  writeStorage(key, v, exp)
}

/** Simple concurrency limiter. */
let running = 0
const queue = []
let maxConcurrency = 4
export function setMaxConcurrency(n) { maxConcurrency = n }
function schedule(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject })
    pump()
  })
}
function pump() {
  while (running < maxConcurrency && queue.length) {
    const { task, resolve, reject } = queue.shift()
    running++
    Promise.resolve().then(task).then(resolve, reject).finally(() => { running--; pump() })
  }
}

/**
 * cached(key, ttl, fetcher) — returns cached value if fresh, otherwise runs fetcher
 * (de-duplicated across simultaneous callers) and stores the result.
 */
export async function cached(key, ttl, fetcher) {
  const hit = getCached(key)
  if (hit !== undefined) return hit
  if (inflight.has(key)) return inflight.get(key)
  const p = schedule(fetcher)
    .then((v) => { setCached(key, v, ttl); return v })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

export function clearCache() {
  mem.clear()
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k))
  } catch { /* ignore */ }
}
