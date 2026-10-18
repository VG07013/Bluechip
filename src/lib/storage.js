/** localStorage helpers with JSON + namespacing. */
const NS = 'bluechip:'
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch { return fallback }
}
export function save(key, value) {
  try { localStorage.setItem(NS + key, JSON.stringify(value)) } catch { /* ignore */ }
}
export function remove(key) {
  try { localStorage.removeItem(NS + key) } catch { /* ignore */ }
}
