/** Number & date formatting helpers. All return '—' for missing values. */
export const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const DASH = '—'

export function fmtNumber(v, digits = 2) {
  if (!isNum(v)) return DASH
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
export function fmtMoney(v, digits = 2) {
  if (!isNum(v)) return DASH
  return '$' + fmtNumber(v, digits)
}
export function fmtPct(v, digits = 2, { sign = false } = {}) {
  if (!isNum(v)) return DASH
  const s = sign && v > 0 ? '+' : ''
  return s + fmtNumber(v, digits) + '%'
}
/** 1234567890 -> 1.23B */
export function fmtBig(v, digits = 2) {
  if (!isNum(v)) return DASH
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e12) return sign + (abs / 1e12).toFixed(digits) + 'T'
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(digits) + 'B'
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(digits) + 'M'
  if (abs >= 1e3) return sign + (abs / 1e3).toFixed(digits) + 'K'
  return sign + abs.toFixed(digits)
}
export function fmtBigMoney(v, digits = 2) {
  if (!isNum(v)) return DASH
  return (v < 0 ? '-$' : '$') + fmtBig(Math.abs(v), digits)
}
export function fmtRatio(v, digits = 2) {
  if (!isNum(v)) return DASH
  return fmtNumber(v, digits)
}
export function fmtDate(d, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!d) return DASH
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('en-US', opts)
}
export function fmtShortDate(d) { return fmtDate(d, { month: 'short', day: 'numeric' }) }
export function fmtTime(d) {
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
export function timeAgo(d) {
  const t = (d instanceof Date ? d : new Date(d)).getTime()
  const diff = Math.max(0, Date.now() - t)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const dd = Math.floor(h / 24)
  if (dd < 7) return `${dd}d ago`
  return fmtShortDate(d)
}
export function toISODate(d) {
  const date = d instanceof Date ? d : new Date(d)
  return date.toISOString().slice(0, 10)
}

/** Format a value according to a metric "kind" (see snapshotFields.js). */
export function fmtByKind(v, kind) {
  switch (kind) {
    case 'pct': return fmtPct(v)
    case 'pctSigned': return fmtPct(v, 2, { sign: true })
    case 'money': return fmtMoney(v)
    case 'bigmoney': return fmtBigMoney(v)
    case 'big': return fmtBig(v)
    case 'ratio': return fmtRatio(v)
    case 'int': return isNum(v) ? v.toLocaleString('en-US') : DASH
    case 'date': return fmtDate(v)
    case 'text': return v == null || v === '' ? DASH : String(v)
    default: return isNum(v) ? fmtNumber(v) : (v ?? DASH)
  }
}
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
