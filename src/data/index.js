/**
 * Unified data facade. Every page imports from here and never talks to a provider directly.
 *
 *   provider = 'fmp' | 'polygon' | 'demo'  (config/api.js)
 *
 * Each getter tries the live provider, and if the key is missing or the request fails,
 * substitutes demo data for tickers we know and reports the fallback (data/status.js)
 * so the UI can show a friendly note instead of a broken page.
 */
import { API_CONFIG, hasLiveProvider } from '../config/api'
import { cached, setMaxConcurrency } from '../lib/cache'
import * as fmp from './fmp'
import * as poly from './polygon'
import * as demo from './demo'
import * as st from './stocktwits'
import { reportFallback, reportOk } from './status'
import { lookup, STOCKS } from './universe'
import { toISODate } from '../lib/format'

setMaxConcurrency(API_CONFIG.maxConcurrency)
const P = () => (hasLiveProvider() ? API_CONFIG.provider : 'demo')
const TTL = API_CONFIG.cacheTtl

export class NotFoundError extends Error {
  constructor(symbol) { super(`We couldn't find a ticker called "${symbol}".`); this.symbol = symbol; this.notFound = true }
}
export const normalizeSymbol = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, '')

/**
 * Try `live()`; on failure use `fallback()` when available. `label` is for the status pill.
 * In demo mode, go straight to fallback.
 */
async function withFallback(label, live, fallback, symbol) {
  if (P() === 'demo') {
    const v = await fallback()
    if (v == null && symbol) throw new NotFoundError(symbol)
    return v
  }
  try {
    const v = await live()
    reportOk()
    return v
  } catch (e) {
    if (e?.status === 404 || /unknown ticker|no quote/i.test(e?.message || '')) throw new NotFoundError(symbol || label)
    const v = await fallback()
    if (v == null || (Array.isArray(v) && !v.length)) {
      if (symbol && !lookup(symbol)) throw new NotFoundError(symbol)
      throw e
    }
    reportFallback(`${label}: ${e.message || 'request failed'}`, e)
    return v
  }
}

/* ------------------------------------------------------------------ prices */

export const getQuote = (symbol) => withFallback('quote', () => (P() === 'fmp' ? fmp.quote(symbol) : poly.quote(symbol)), () => demo.quote(symbol), symbol)
export const getQuotes = async (symbols) => {
  if (!symbols.length) return []
  if (P() === 'fmp') { try { const r = await fmp.batchQuotes(symbols); reportOk(); return r } catch (e) { reportFallback('quotes', e) } }
  return Promise.all(symbols.map((s) => getQuote(s).catch(() => null))).then((r) => r.filter(Boolean))
}
export const getHistory = (symbol) => withFallback('history', () => (P() === 'fmp' ? fmp.history(symbol) : poly.history(symbol)), () => demo.history(symbol), symbol)
export const getIntraday = (symbol) => withFallback('intraday', () => (P() === 'fmp' ? fmp.intraday(symbol) : poly.intraday(symbol)), () => demo.intraday(symbol), symbol)

/** Bars for a chart range. Returns {bars, intraday:boolean}. */
export async function getChartBars(symbol, range) {
  if (range === '1D') {
    const bars = await getIntraday(symbol)
    if (bars.length) return { bars, intraday: true }
  }
  const all = await getHistory(symbol)
  const days = { '1W': 7, '1M': 31, '3M': 92, '6M': 183, 'YTD': null, '1Y': 366, '5Y': 1830, 'Max': Infinity, '1D': 5 }[range] ?? 366
  if (range === 'YTD') {
    const y = new Date().getFullYear()
    return { bars: all.filter((b) => new Date(b.time).getFullYear() === y), intraday: false }
  }
  if (days === Infinity) return { bars: all, intraday: false }
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days)
  const iso = toISODate(cutoff)
  return { bars: all.filter((b) => b.time >= iso), intraday: false }
}

/* ---------------------------------------------------------------- snapshot */

/** Profile + quote + every Finviz metric, normalized. */
export async function getSnapshot(symbolRaw) {
  const symbol = normalizeSymbol(symbolRaw)
  if (!symbol) throw new NotFoundError(symbolRaw)
  return cached(`snap:${P()}:${symbol}`, TTL.quote, () =>
    withFallback('snapshot', () => (P() === 'fmp' ? liveSnapshotFMP(symbol) : liveSnapshotPolygon(symbol)), () => demo.snapshot(symbol), symbol))
}

async function liveSnapshotFMP(symbol) {
  const [profile, quote, fund, bars, next] = await Promise.all([
    fmp.profile(symbol), fmp.quote(symbol), fmp.fundamentals(symbol).catch(() => ({})), fmp.history(symbol).catch(() => []), fmp.nextEarnings(symbol).catch(() => null),
  ])
  let fin = []
  try { fin = await fmp.financials(symbol, 'quarter') } catch { /* ignore */ }
  return buildSnapshot({ profile, quote, fund, bars, next, quarterly: fin, source: 'fmp' })
}
async function liveSnapshotPolygon(symbol) {
  const [profile, quote, bars] = await Promise.all([poly.profile(symbol), poly.quote(symbol), poly.history(symbol).catch(() => [])])
  let fin = []
  try { fin = await poly.financials(symbol, 'quarterly') } catch { /* ignore */ }
  quote.marketCap = profile.marketCap; quote.sharesOutstanding = profile.sharesOutstanding
  return buildSnapshot({ profile, quote, fund: {}, bars, next: null, quarterly: fin, source: 'polygon' })
}

/** Merge raw pieces into the snapshot shape used across the app. */
function buildSnapshot({ profile, quote, fund, bars, next, quarterly, source }) {
  const m = { ...fund }
  const q = quote
  if (bars.length > 30) Object.assign(m, demo.technicals(bars, q))
  m.price = q.price; m.change = q.changePct; m.prevClose = q.prevClose; m.volume = q.volume
  m.avgVolume = q.avgVolume ?? (bars.length ? Math.round(bars.slice(-90).reduce((a, b) => a + b.volume, 0) / Math.min(90, bars.length)) : null)
  m.relVolume = q.volume && m.avgVolume ? q.volume / m.avgVolume : null
  m.marketCap = q.marketCap ?? m.marketCap
  m.beta = profile.beta ?? m.beta ?? null
  m.sector = profile.sector; m.industry = profile.industry; m.country = profile.country; m.exchange = profile.exchange
  m.employees = profile.employees
  m.eps = m.eps ?? q.eps; m.pe = m.pe ?? q.pe
  m.sharesOutstanding = m.sharesOutstanding ?? q.sharesOutstanding
  if (quarterly.length >= 4) {
    const ttm = quarterly.slice(-4), prev = quarterly.slice(-8, -4)
    const sum = (arr, k) => arr.reduce((a, b) => a + (b[k] || 0), 0)
    m.sales = sum(ttm, 'revenue'); m.income = sum(ttm, 'netIncome')
    if (prev.length === 4) {
      m.salesYoY = m.salesYoY ?? ((m.sales - sum(prev, 'revenue')) / Math.abs(sum(prev, 'revenue'))) * 100
      m.epsYoY = m.epsYoY ?? ((sum(ttm, 'eps') - sum(prev, 'eps')) / Math.abs(sum(prev, 'eps') || 1)) * 100
      m.salesQoQ = ((quarterly.at(-1).revenue - quarterly.at(-5).revenue) / Math.abs(quarterly.at(-5).revenue)) * 100
      m.earningsQoQ = ((quarterly.at(-1).netIncome - quarterly.at(-5).netIncome) / Math.abs(quarterly.at(-5).netIncome || 1)) * 100
    }
    m.grossMargin = m.grossMargin ?? (sum(ttm, 'grossProfit') / m.sales) * 100
    m.operMargin = m.operMargin ?? (sum(ttm, 'operatingIncome') / m.sales) * 100
    m.profitMargin = m.profitMargin ?? (m.income / m.sales) * 100
    const last = quarterly.at(-1)
    if (last.equity) { m.roe = m.roe ?? (m.income / last.equity) * 100; m.debtEq = m.debtEq ?? (last.totalDebt ?? 0) / last.equity; m.ltDebtEq = m.ltDebtEq ?? (last.longTermDebt ?? 0) / last.equity }
    if (last.totalAssets) m.roa = m.roa ?? (m.income / last.totalAssets) * 100
    if (last.currentLiabilities) { m.currentRatio = m.currentRatio ?? last.currentAssets / last.currentLiabilities; m.quickRatio = m.quickRatio ?? (last.currentAssets - (last.inventory || 0)) / last.currentLiabilities }
    m.ps = m.ps ?? (m.marketCap && m.sales ? m.marketCap / m.sales : null)
  }
  if (m.epsNextY && q.price) m.forwardPe = q.price / m.epsNextY
  if (m.epsThisYEst && m.eps) m.epsThisY = ((m.epsThisYEst - m.eps) / Math.abs(m.eps)) * 100
  if (m.pe && m.epsYoY > 0) m.peg = m.peg ?? m.pe / m.epsYoY
  if (next) { m.earningsDate = `${next.date}${next.time ? ' ' + String(next.time).toUpperCase() : ''}`; m.earningsDateISO = next.date }
  else if (q.earningsAnnouncement) { m.earningsDate = q.earningsAnnouncement.slice(0, 10); m.earningsDateISO = m.earningsDate }
  m.optionShort = null // not available from FMP/Polygon
  const local = lookup(profile.symbol)
  m.index = local?.index ?? null
  return { ...profile, quote: q, metrics: m, source }
}

/* ------------------------------------------------------------ fundamentals */

export const getFinancials = (symbol, period) => withFallback('financials', () => (P() === 'fmp' ? fmp.financials(symbol, period) : poly.financials(symbol, period)), () => demo.financials(symbol, period), symbol)
export const getEarningsHistory = (symbol) => withFallback('earnings', () => (P() === 'fmp' ? fmp.earningsHistory(symbol) : Promise.reject(new Error('Not on Polygon'))), () => demo.earningsHistory(symbol))
export const getAnalyst = (symbol) => withFallback('analyst', () => (P() === 'fmp' ? fmp.analyst(symbol) : Promise.reject(new Error('Not on Polygon'))), () => demo.analyst(symbol))
export const getInsiderTrades = (symbol) => withFallback('insiders', () => (P() === 'fmp' ? fmp.insiderTrades(symbol) : Promise.reject(new Error('Not on Polygon'))), () => demo.insiderTrades(symbol))
export const getPeers = (symbol) => withFallback('peers', () => (P() === 'fmp' ? fmp.peers(symbol) : Promise.reject(new Error('Not on Polygon'))), () => demo.peers(symbol))
export const getPeHistory = async (symbol) => {
  try {
    const fin = await getFinancials(symbol, 'annual')
    const bars = await getHistory(symbol)
    return fin.slice(-5).map((y) => { const bar = bars.find((b) => b.time >= y.date) || bars.at(-1); return { year: y.fiscalYear, pe: y.eps > 0 && bar ? bar.close / y.eps : null } }).filter((x) => x.pe)
  } catch { return demo.peHistory(symbol) }
}
export const getSectorPe = async (sector) => {
  if (P() === 'fmp') { try { const map = await fmp.sectorPe(); if (map[sector]) return map[sector] } catch { /* ignore */ } }
  return demo.SECTOR_PE[sector] ?? 20
}

/* ------------------------------------------------------------------- news */

export const getNews = (symbol, limit = 12) => withFallback('news', () => (P() === 'fmp' ? fmp.news(symbol, limit) : poly.news(symbol, limit)), () => demo.news(symbol, limit))

/* ----------------------------------------------------------------- market */

export const getGainers = () => withFallback('gainers', () => (P() === 'fmp' ? fmp.gainers() : poly.gainersLosers('gainers')), () => demo.gainers(10))
export const getLosers = () => withFallback('losers', () => (P() === 'fmp' ? fmp.losers() : poly.gainersLosers('losers')), () => demo.losers(10))
export const getIndexQuotes = () => withFallback('indexes', async () => {
  const syms = ['^GSPC', '^IXIC', '^DJI', '^RUT', '^VIX']
  const short = { '^GSPC': 'S&P 500', '^IXIC': 'Nasdaq', '^DJI': 'Dow', '^RUT': 'Russell 2000', '^VIX': 'VIX' }
  if (P() === 'fmp') return (await fmp.batchQuotes(syms)).map((q) => ({ ...q, short: short[q.symbol] }))
  // Polygon has no free index quotes: use ETF proxies
  const proxies = { SPY: 'S&P 500', QQQ: 'Nasdaq', DIA: 'Dow', IWM: 'Russell 2000', VIXY: 'VIX' }
  return Promise.all(Object.entries(proxies).map(async ([s, name]) => ({ ...(await poly.quote(s)), short: name })))
}, () => demo.indexQuotes())

export const getTrending = (n = 10) => st.trending(n, getQuote, getHistory)
export const getSentiment = (symbol) => st.sentiment(symbol)

/* -------------------------------------------------------------- calendars */

export const getEarningsCalendar = (from, to) => withFallback('earnings calendar', () => (P() === 'fmp' ? fmp.earningsCalendar(from, to) : Promise.reject(new Error('Not on Polygon'))), () => demo.earningsCalendar(from, to))
export const getEconomicCalendar = (from, to) => withFallback('economic calendar', () => (P() === 'fmp' ? fmp.economicCalendar(from, to) : Promise.reject(new Error('Not on Polygon'))), () => demo.economicCalendar(from, to))

/* ----------------------------------------------------------------- search */

/** Local, instant results (universe) are always available; remote results merge in when live. */
export const searchLocal = () => demo.searchUniverse()
export async function searchRemote(query) {
  if (P() === 'demo' || query.length < 2) return []
  try { return P() === 'fmp' ? await fmp.search(query) : await poly.search(query) } catch { return [] }
}

/* --------------------------------------------------------------- screener */

/**
 * Screener rows: full snapshot for each stock in the universe.
 * Live mode fetches snapshots lazily (cached) with the concurrency limiter; `onProgress`
 * lets the page render as rows arrive.
 */
export async function getScreenerRows(onProgress) {
  const syms = STOCKS.map((s) => s.symbol)
  if (P() === 'demo') { const rows = demo.allStockSnapshots().map(toRow); onProgress?.(rows); return rows }
  const rows = []
  for (const s of syms) {
    try { rows.push(toRow(await getSnapshot(s))) } catch { /* skip */ }
    if (rows.length % 5 === 0) onProgress?.([...rows])
  }
  onProgress?.(rows)
  return rows
}
export const toRow = (s) => ({ symbol: s.symbol, name: s.name, sector: s.sector, industry: s.industry, exchange: s.exchange, country: s.country, ...s.metrics, price: s.quote.price, change: s.quote.changePct, marketCap: s.quote.marketCap ?? s.metrics.marketCap })

export { lookup }

/** Synchronous peek at an already-loaded snapshot (used by search to show metric values). */
import { getCached } from '../lib/cache'
export function peekSnapshot(symbol) {
  const s = normalizeSymbol(symbol)
  const hit = getCached(`snap:${P()}:${s}`)
  if (hit) return hit
  if (P() === 'demo') return demo.snapshot(s)
  return null
}
