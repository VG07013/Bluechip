/**
 * Polygon.io client. Polygon is strong on prices/news/reference data but thin on
 * Finviz-style fundamentals, so when Polygon is the provider most snapshot metrics
 * come from the financials endpoint (limited) and price-derived technicals.
 */
import { API_CONFIG } from '../config/api'
import { cached } from '../lib/cache'
import { getJSON } from './http'
import { toISODate } from '../lib/format'

const TTL = API_CONFIG.cacheTtl
const url = (path, params = {}) => {
  const u = new URL(API_CONFIG.polygon.base + path)
  Object.entries(params).forEach(([k, v]) => v != null && u.searchParams.set(k, v))
  u.searchParams.set('apiKey', API_CONFIG.polygon.key)
  return u.toString()
}
const get = (p, q) => getJSON(url(p, q))

export async function profile(symbol) {
  return cached(`poly:profile:${symbol}`, TTL.profile, async () => {
    const { results: r } = await get(`/v3/reference/tickers/${symbol}`)
    if (!r) throw new Error(`Unknown ticker ${symbol}`)
    return {
      symbol: r.ticker, name: r.name, exchange: r.primary_exchange, sector: null, industry: r.sic_description,
      country: r.locale === 'us' ? 'USA' : r.locale, employees: r.total_employees, description: r.description,
      logo: r.branding?.icon_url ? `${r.branding.icon_url}?apiKey=${API_CONFIG.polygon.key}` : null,
      website: r.homepage_url, ceo: null, type: r.type === 'ETF' ? 'etf' : 'stock', marketCap: r.market_cap, sharesOutstanding: r.share_class_shares_outstanding,
    }
  })
}
export async function quote(symbol) {
  return cached(`poly:quote:${symbol}`, TTL.quote, async () => {
    const { ticker: t } = await get(`/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`)
    if (!t) throw new Error(`No quote for ${symbol}`)
    const price = t.lastTrade?.p ?? t.day?.c ?? t.prevDay?.c
    return {
      symbol, price, change: t.todaysChange, changePct: t.todaysChangePerc, open: t.day?.o, prevClose: t.prevDay?.c,
      dayLow: t.day?.l, dayHigh: t.day?.h, volume: t.day?.v, avgVolume: null, marketCap: null, timestamp: t.updated / 1e6,
    }
  })
}
export async function history(symbol) {
  return cached(`poly:hist:${symbol}`, TTL.history, async () => {
    const from = new Date(); from.setFullYear(from.getFullYear() - 10)
    const { results } = await get(`/v2/aggs/ticker/${symbol}/range/1/day/${toISODate(from)}/${toISODate(new Date())}`, { adjusted: true, sort: 'asc', limit: 50000 })
    return (results || []).map((b) => ({ time: toISODate(new Date(b.t)), open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }))
  })
}
export async function intraday(symbol) {
  return cached(`poly:intra:${symbol}`, TTL.intraday, async () => {
    const d = toISODate(new Date())
    const { results } = await get(`/v2/aggs/ticker/${symbol}/range/5/minute/${d}/${d}`, { adjusted: true, sort: 'asc', limit: 500 })
    return (results || []).map((b) => ({ time: Math.floor(b.t / 1000), open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }))
  })
}
export async function news(symbol, limit = 12) {
  return cached(`poly:news:${symbol || 'all'}`, TTL.news, async () => {
    const { results } = await get('/v2/reference/news', { ticker: symbol, limit, order: 'desc' })
    return (results || []).map((n) => ({ id: n.id, symbol: n.tickers?.[0] || symbol, title: n.title, source: n.publisher?.name, url: n.article_url, publishedAt: n.published_utc, summary: n.description, image: n.image_url, sentiment: n.insights?.[0]?.sentiment }))
  })
}
export async function search(query) {
  return cached(`poly:search:${query.toLowerCase()}`, TTL.search, async () => {
    const { results } = await get('/v3/reference/tickers', { search: query, active: true, market: 'stocks', limit: 12 })
    return (results || []).map((r) => ({ symbol: r.ticker, name: r.name, exchange: r.primary_exchange, type: r.type === 'ETF' ? 'etf' : 'stock' }))
  })
}
export async function gainersLosers(direction) {
  return cached(`poly:${direction}`, TTL.quote * 5, async () => {
    const { tickers } = await get(`/v2/snapshot/locale/us/markets/stocks/${direction}`)
    return (tickers || []).slice(0, 10).map((t) => ({ symbol: t.ticker, name: t.ticker, price: t.lastTrade?.p ?? t.day?.c, change: t.todaysChange, changePct: t.todaysChangePerc }))
  })
}
/** Polygon fundamentals (vX) — returns the latest annual & quarterly rows mapped to our statement shape. */
export async function financials(symbol, period = 'annual') {
  return cached(`poly:fin:${symbol}:${period}`, TTL.fundamentals, async () => {
    const { results } = await get('/vX/reference/financials', { ticker: symbol, timeframe: period === 'annual' ? 'annual' : 'quarterly', limit: period === 'annual' ? 6 : 8, order: 'desc' })
    return (results || []).map((f) => {
      const I = f.financials?.income_statement || {}, B = f.financials?.balance_sheet || {}, C = f.financials?.cash_flow_statement || {}
      const v = (o) => o?.value ?? null
      return {
        date: f.end_date, period: f.fiscal_period, fiscalYear: Number(f.fiscal_year), revenue: v(I.revenues), grossProfit: v(I.gross_profit), operatingIncome: v(I.operating_income_loss), netIncome: v(I.net_income_loss),
        eps: v(I.diluted_earnings_per_share), sharesOutstanding: v(I.diluted_average_shares), totalDebt: v(B.long_term_debt), longTermDebt: v(B.long_term_debt), cash: null,
        operatingCashFlow: v(C.net_cash_flow_from_operating_activities), capex: null, freeCashFlow: null, equity: v(B.equity), totalAssets: v(B.assets), currentAssets: v(B.current_assets), currentLiabilities: v(B.current_liabilities), inventory: v(B.inventory),
      }
    }).sort((a, b) => (a.date < b.date ? -1 : 1))
  })
}
