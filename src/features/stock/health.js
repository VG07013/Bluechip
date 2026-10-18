/**
 * Health score (0–100) across growth, profitability and balance-sheet strength.
 * Each metric is mapped to 0..100 over a sensible range and averaged. Summary only — not advice.
 */
import { isNum, clamp } from '../../lib/format'

const scale = (v, lo, hi) => (isNum(v) ? clamp(((v - lo) / (hi - lo)) * 100, 0, 100) : null)
const inv = (v, lo, hi) => (isNum(v) ? 100 - clamp(((v - lo) / (hi - lo)) * 100, 0, 100) : null)
const avg = (arr) => { const a = arr.filter(isNum); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null }

export function healthScore(m = {}) {
  const growth = avg([scale(m.salesYoY, -10, 30), scale(m.epsYoY, -20, 40), scale(m.salesPast5Y, 0, 25), scale(m.epsNext5Y, 0, 25)])
  const profitability = avg([scale(m.roe, 0, 40), scale(m.grossMargin, 10, 70), scale(m.operMargin, 0, 35), scale(m.profitMargin, 0, 30), scale(m.roic, 0, 30)])
  const balance = avg([scale(m.currentRatio, 0.5, 3), scale(m.quickRatio, 0.3, 2), inv(m.debtEq, 0, 2), inv(m.ltDebtEq, 0, 1.5)])
  const overall = avg([growth, profitability, balance])
  const r = (v) => (isNum(v) ? Math.round(v) : null)
  return { growth: r(growth), profitability: r(profitability), balance: r(balance), overall: r(overall) }
}
export const healthLabel = (v) => (v == null ? '—' : v >= 75 ? 'Strong' : v >= 55 ? 'Solid' : v >= 35 ? 'Mixed' : 'Weak')
