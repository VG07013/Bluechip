/** Technical indicators computed client-side from daily closes. */
export function sma(values, period) {
  const out = new Array(values.length).fill(null)
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

export function rsi(values, period = 14) {
  const out = new Array(values.length).fill(null)
  if (values.length <= period) return out
  let gain = 0, loss = 0
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1]
    if (d >= 0) gain += d; else loss -= d
  }
  let avgG = gain / period, avgL = loss / period
  out[period] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL)
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period
    out[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL)
  }
  return out
}

/** Average true range over `period` days from OHLC bars. */
export function atr(bars, period = 14) {
  if (bars.length < period + 1) return null
  const trs = []
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i], p = bars[i - 1]
    trs.push(Math.max(b.high - b.low, Math.abs(b.high - p.close), Math.abs(b.low - p.close)))
  }
  const last = trs.slice(-period)
  return last.reduce((a, b) => a + b, 0) / last.length
}

/** Average daily % range over N bars (Finviz "Volatility"). */
export function volatility(bars, n) {
  const last = bars.slice(-n)
  if (!last.length) return null
  return last.reduce((a, b) => a + ((b.high - b.low) / b.close) * 100, 0) / last.length
}

/** % change between close N trading days ago and now. */
export function perf(closes, daysBack) {
  if (closes.length <= daysBack) return null
  const a = closes[closes.length - 1 - daysBack], b = closes[closes.length - 1]
  return ((b - a) / a) * 100
}

export function perfYTD(bars) {
  if (!bars.length) return null
  const year = new Date(bars[bars.length - 1].time).getFullYear()
  const first = bars.find((b) => new Date(b.time).getFullYear() === year)
  if (!first) return null
  return ((bars[bars.length - 1].close - first.close) / first.close) * 100
}
