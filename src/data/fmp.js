/**
 * Financial Modeling Prep client (https://site.financialmodelingprep.com/developer/docs)
 * Uses the "stable" API. Every function returns Bluechip's normalized shapes.
 * Endpoints marked PREMIUM may 402/403 on the free tier — callers fall back gracefully.
 */
import { API_CONFIG } from '../config/api'
import { cached } from '../lib/cache'
import { getJSON } from './http'
import { toISODate } from '../lib/format'

const TTL = API_CONFIG.cacheTtl
const base = () => API_CONFIG.fmp.base
const key = () => API_CONFIG.fmp.key
const url = (path, params = {}) => {
  const u = new URL(base() + path)
  Object.entries(params).forEach(([k, v]) => v != null && u.searchParams.set(k, v))
  u.searchParams.set('apikey', key())
  return u.toString()
}
const get = (path, params) => getJSON(url(path, params))
const first = (arr) => (Array.isArray(arr) ? arr[0] : arr) || null
const pct = (v) => (typeof v === 'number' ? v * 100 : null)

export async function quote(symbol) {
  return cached(`fmp:quote:${symbol}`, TTL.quote, async () => {
    const q = first(await get('/quote', { symbol }))
    if (!q) throw new Error(`No quote for ${symbol}`)
    return normalizeQuote(q)
  })
}
export async function batchQuotes(symbols) {
  return cached(`fmp:batch:${symbols.join(',')}`, TTL.quote, async () => {
    const arr = await get('/batch-quote', { symbols: symbols.join(',') })
    return (arr || []).map(normalizeQuote)
  })
}
function normalizeQuote(q) {
  return {
    symbol: q.symbol, name: q.name, exchange: q.exchange,
    price: q.price, change: q.change, changePct: q.changePercentage ?? q.changesPercentage,
    open: q.open, prevClose: q.previousClose, dayLow: q.dayLow, dayHigh: q.dayHigh,
    volume: q.volume, avgVolume: q.avgVolume, marketCap: q.marketCap,
    yearHigh: q.yearHigh, yearLow: q.yearLow, sma50: q.priceAvg50, sma200: q.priceAvg200,
    eps: q.eps, pe: q.pe, sharesOutstanding: q.sharesOutstanding, earningsAnnouncement: q.earningsAnnouncement,
    timestamp: (q.timestamp || 0) * 1000,
  }
}

export async function profile(symbol) {
  return cached(`fmp:profile:${symbol}`, TTL.profile, async () => {
    const p = first(await get('/profile', { symbol }))
    if (!p) throw new Error(`Unknown ticker ${symbol}`)
    return {
      symbol: p.symbol, name: p.companyName, exchange: p.exchangeShortName || p.exchange, sector: p.sector, industry: p.industry,
      country: p.country, employees: Number(p.fullTimeEmployees) || null, description: p.description, logo: p.image,
      website: p.website, ceo: p.ceo, beta: p.beta, lastDividend: p.lastDividend, type: p.isEtf ? 'etf' : 'stock',
      ipoDate: p.ipoDate,
    }
  })
}

export async function history(symbol) {
  return cached(`fmp:hist:${symbol}`, TTL.history, async () => {
    const from = new Date(); from.setFullYear(from.getFullYear() - 10)
    const res = await get('/historical-price-eod/full', { symbol, from: toISODate(from) })
    const arr = Array.isArray(res) ? res : res?.historical || []
    return arr.map((b) => ({ time: b.date, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume })).sort((a, b) => (a.time < b.time ? -1 : 1))
  })
}
export async function intraday(symbol) {
  return cached(`fmp:intra:${symbol}`, TTL.intraday, async () => {
    const arr = await get('/historical-chart/5min', { symbol })
    const bars = (arr || []).map((b) => ({ time: Math.floor(new Date(b.date.replace(' ', 'T')).getTime() / 1000), open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume })).sort((a, b) => a.time - b.time)
    // keep the last trading session only
    const lastDay = bars.length ? new Date(bars.at(-1).time * 1000).toDateString() : ''
    return bars.filter((b) => new Date(b.time * 1000).toDateString() === lastDay)
  })
}

/** Key metrics + ratios (TTM) + growth, merged into Finviz-style keys. */
export async function fundamentals(symbol) {
  return cached(`fmp:fund:${symbol}`, TTL.fundamentals, async () => {
    const [km, ra, gr, est, flt, div] = await Promise.all([
      get('/key-metrics-ttm', { symbol }).then(first).catch(() => null),
      get('/ratios-ttm', { symbol }).then(first).catch(() => null),
      get('/financial-growth', { symbol, period: 'annual', limit: 1 }).then(first).catch(() => null),
      get('/analyst-estimates', { symbol, period: 'annual', limit: 2 }).catch(() => null),   // PREMIUM on some plans
      get('/shares-float', { symbol }).then(first).catch(() => null),
      get('/dividends', { symbol, limit: 4 }).catch(() => null),
    ])
    const m = {}
    if (ra) {
      m.pe = ra.priceToEarningsRatioTTM; m.peg = ra.priceToEarningsGrowthRatioTTM ?? ra.forwardPriceToEarningsGrowthRatioTTM
      m.ps = ra.priceToSalesRatioTTM; m.pb = ra.priceToBookRatioTTM; m.pfcf = ra.priceToFreeCashFlowRatioTTM
      m.pc = ra.priceToOperatingCashFlowRatioTTM
      m.grossMargin = pct(ra.grossProfitMarginTTM); m.operMargin = pct(ra.operatingProfitMarginTTM); m.profitMargin = pct(ra.netProfitMarginTTM)
      m.currentRatio = ra.currentRatioTTM; m.quickRatio = ra.quickRatioTTM; m.debtEq = ra.debtToEquityRatioTTM
      m.ltDebtEq = ra.longTermDebtToCapitalRatioTTM ?? null
      m.payout = pct(ra.dividendPayoutRatioTTM); m.dividendYield = pct(ra.dividendYieldTTM)
      m.bookPerShare = ra.bookValuePerShareTTM; m.cashPerShare = ra.cashPerShareTTM; m.eps = ra.netIncomePerShareTTM
      m.roe = pct(ra.returnOnEquityTTM); m.roa = pct(ra.returnOnAssetsTTM)
    }
    if (km) {
      m.marketCap = km.marketCap; m.roic = pct(km.returnOnInvestedCapitalTTM); m.roe = m.roe ?? pct(km.returnOnEquityTTM)
      m.roa = m.roa ?? pct(km.returnOnAssetsTTM); m.currentRatio = m.currentRatio ?? km.currentRatioTTM
    }
    if (gr) {
      m.salesYoY = pct(gr.revenueGrowth); m.epsYoY = pct(gr.epsgrowth ?? gr.epsGrowth)
      m.salesPast5Y = pct(gr.fiveYRevenueGrowthPerShare); m.epsPast5Y = pct(gr.fiveYNetIncomeGrowthPerShare)
      m.sharesOutstandingYoY = pct(gr.weightedAverageSharesGrowth)
    }
    if (Array.isArray(est) && est.length) {
      const sorted = [...est].sort((a, b) => (a.date < b.date ? -1 : 1))
      const thisY = sorted[0], nextY = sorted[1] || sorted[0]
      m.epsNextY = nextY?.epsAvg; m.epsThisYEst = thisY?.epsAvg
      if (m.eps && m.epsNextY) m.forwardPe = null // computed later with price
    }
    if (flt) { m.sharesFloat = flt.floatShares; m.sharesOutstanding = flt.outstandingShares }
    if (Array.isArray(div) && div.length) {
      const last4 = div.slice(0, 4)
      m.dividendTTM = last4.reduce((a, d) => a + (d.dividend || d.adjDividend || 0), 0)
      m.dividendExDate = div[0].date; m.dividendEst = m.dividendTTM
    }
    return m
  })
}

/** Income / balance / cash-flow statements merged by period. */
export async function financials(symbol, period = 'annual') {
  return cached(`fmp:fin:${symbol}:${period}`, TTL.fundamentals, async () => {
    const p = period === 'annual' ? 'annual' : 'quarter'
    const limit = p === 'annual' ? 6 : 8
    const [inc, bal, cf] = await Promise.all([
      get('/income-statement', { symbol, period: p, limit }),
      get('/balance-sheet-statement', { symbol, period: p, limit }).catch(() => []),
      get('/cash-flow-statement', { symbol, period: p, limit }).catch(() => []),
    ])
    const byDate = (arr) => Object.fromEntries((arr || []).map((x) => [x.date, x]))
    const B = byDate(bal), C = byDate(cf)
    return (inc || []).map((i) => {
      const b = B[i.date] || {}, c = C[i.date] || {}
      return {
        date: i.date, period: i.period, fiscalYear: Number(i.fiscalYear || i.calendarYear),
        revenue: i.revenue, grossProfit: i.grossProfit, operatingIncome: i.operatingIncome, netIncome: i.netIncome,
        eps: i.epsDiluted ?? i.eps, sharesOutstanding: i.weightedAverageShsOutDil ?? i.weightedAverageShsOut,
        totalDebt: b.totalDebt, longTermDebt: b.longTermDebt, cash: b.cashAndCashEquivalents ?? b.cashAndShortTermInvestments,
        operatingCashFlow: c.operatingCashFlow ?? c.netCashProvidedByOperatingActivities, capex: Math.abs(c.capitalExpenditure || 0), freeCashFlow: c.freeCashFlow,
        equity: b.totalStockholdersEquity, totalAssets: b.totalAssets, currentAssets: b.totalCurrentAssets, currentLiabilities: b.totalCurrentLiabilities, inventory: b.inventory,
      }
    }).sort((a, b) => (a.date < b.date ? -1 : 1))
  })
}

export async function earningsHistory(symbol) {
  return cached(`fmp:earn:${symbol}`, TTL.fundamentals, async () => {
    const arr = await get('/earnings', { symbol, limit: 12 })
    return (arr || []).filter((e) => e.epsActual != null).map((e) => ({
      date: e.date, period: e.date, time: e.time || '',
      epsEstimate: e.epsEstimated, epsActual: e.epsActual, revenueEstimate: e.revenueEstimated, revenueActual: e.revenueActual,
      surprisePct: e.epsEstimated ? ((e.epsActual - e.epsEstimated) / Math.abs(e.epsEstimated)) * 100 : null,
    }))
  })
}
export async function nextEarnings(symbol) {
  return cached(`fmp:nextearn:${symbol}`, TTL.fundamentals, async () => {
    const arr = await get('/earnings', { symbol, limit: 12 })
    const t = toISODate(new Date())
    const up = (arr || []).filter((e) => e.date >= t).sort((a, b) => (a.date < b.date ? -1 : 1))[0]
    return up ? { date: up.date, time: up.time } : null
  })
}

export async function analyst(symbol) {
  return cached(`fmp:analyst:${symbol}`, TTL.fundamentals, async () => {
    const [cons, tgt, grades, tgtHist] = await Promise.all([
      get('/grades-consensus', { symbol }).then(first).catch(() => null),
      get('/price-target-consensus', { symbol }).then(first).catch(() => null),
      get('/grades', { symbol, limit: 12 }).catch(() => []),
      get('/price-target-summary', { symbol }).then(first).catch(() => null),
    ])
    if (!cons && !tgt) return null
    const counts = { strongBuy: cons?.strongBuy || 0, buy: cons?.buy || 0, hold: cons?.hold || 0, sell: cons?.sell || 0, strongSell: cons?.strongSell || 0 }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const score = total ? (counts.strongBuy * 1 + counts.buy * 2 + counts.hold * 3 + counts.sell * 4 + counts.strongSell * 5) / total : null
    const history = tgtHist ? [
      { date: 'Last month', target: tgtHist.lastMonthAvgPriceTarget },
      { date: 'Last quarter', target: tgtHist.lastQuarterAvgPriceTarget },
      { date: 'Last year', target: tgtHist.lastYearAvgPriceTarget },
      { date: 'All time', target: tgtHist.allTimeAvgPriceTarget },
    ].filter((h) => h.target) : []
    return {
      consensus: cons?.consensus || (score ? (score < 1.8 ? 'Strong Buy' : score < 2.5 ? 'Buy' : score < 3.2 ? 'Hold' : 'Sell') : '—'),
      score, counts, total,
      target: tgt ? { low: tgt.targetLow, high: tgt.targetHigh, mean: tgt.targetConsensus, median: tgt.targetMedian } : null,
      history,
      actions: (grades || []).map((g) => ({ date: g.date, firm: g.gradingCompany, action: g.action, from: g.previousGrade, to: g.newGrade, target: null })),
    }
  })
}

export async function insiderTrades(symbol) {
  return cached(`fmp:insider:${symbol}`, TTL.fundamentals, async () => {
    const arr = await get('/insider-trading/search', { symbol, limit: 50 })
    return (arr || []).map((t) => {
      const type = /^S/.test(t.transactionType) ? 'Sale' : /^P|^A/.test(t.transactionType) ? 'Buy' : /^M/.test(t.transactionType) ? 'Option Exercise' : t.transactionType
      return { date: t.transactionDate, name: t.reportingName, title: t.typeOfOwner, type, shares: t.securitiesTransacted, price: t.price, value: (t.securitiesTransacted || 0) * (t.price || 0) }
    })
  })
}

export async function news(symbol, limit = 12) {
  return cached(`fmp:news:${symbol || 'general'}:${limit}`, TTL.news, async () => {
    const arr = symbol ? await get('/news/stock', { symbols: symbol, limit }) : await get('/news/stock-latest', { limit })
    return (arr || []).map((n, i) => ({ id: n.url || i, symbol: n.symbol, title: n.title, source: n.publisher || n.site, url: n.url, publishedAt: n.publishedDate, summary: n.text, image: n.image }))
  })
}

export async function gainers() { return cached('fmp:gainers', TTL.quote * 5, async () => (await get('/biggest-gainers')).map(mover)) }
export async function losers() { return cached('fmp:losers', TTL.quote * 5, async () => (await get('/biggest-losers')).map(mover)) }
export async function mostActive() { return cached('fmp:active', TTL.quote * 5, async () => (await get('/most-actives')).map(mover)) }
const mover = (m) => ({ symbol: m.symbol, name: m.name, price: m.price, change: m.change, changePct: m.changesPercentage ?? m.changePercentage })

export async function peers(symbol) {
  return cached(`fmp:peers:${symbol}`, TTL.profile, async () => {
    const arr = await get('/stock-peers', { symbol })
    return (arr || []).map((p) => p.symbol || p.peersList).flat().filter(Boolean).slice(0, 6)
  })
}

export async function search(query) {
  return cached(`fmp:search:${query.toLowerCase()}`, TTL.search, async () => {
    const [bySym, byName] = await Promise.all([
      get('/search-symbol', { query, limit: 10 }).catch(() => []),
      get('/search-name', { query, limit: 10 }).catch(() => []),
    ])
    const seen = new Set()
    return [...(bySym || []), ...(byName || [])].filter((r) => !seen.has(r.symbol) && seen.add(r.symbol)).map((r) => ({ symbol: r.symbol, name: r.name, exchange: r.exchangeShortName || r.exchange, type: /ETF|Trust|Fund/i.test(r.name) ? 'etf' : 'stock' }))
  })
}

export async function earningsCalendar(from, to) {
  return cached(`fmp:earncal:${from}:${to}`, TTL.calendar, async () => {
    const arr = await get('/earnings-calendar', { from, to })
    return (arr || []).map((e) => ({ date: e.date, symbol: e.symbol, name: e.name || e.symbol, time: e.time || '', epsEstimate: e.epsEstimated, revenueEstimate: e.revenueEstimated, epsActual: e.epsActual }))
  })
}
export async function economicCalendar(from, to) {
  return cached(`fmp:econcal:${from}:${to}`, TTL.calendar, async () => {
    const arr = await get('/economic-calendar', { from, to })
    return (arr || []).filter((e) => e.country === 'US').map((e) => ({ date: (e.date || '').slice(0, 10), time: (e.date || '').slice(11, 16), event: e.event, country: e.country, impact: (e.impact || 'low').toLowerCase(), previous: e.previous, estimate: e.estimate, actual: e.actual }))
  })
}

/** Screener universe: FMP's own screener supports only a few filters; we fetch a big list and filter client-side. */
export async function screenerUniverse(limit = 300) {
  return cached(`fmp:screener:${limit}`, TTL.screener, async () => {
    const arr = await get('/company-screener', { limit, isActivelyTrading: true, exchange: 'NYSE,NASDAQ', marketCapMoreThan: 2e9 })
    return (arr || []).map((s) => ({ symbol: s.symbol, name: s.companyName, exchange: s.exchangeShortName || s.exchange, sector: s.sector, industry: s.industry, marketCap: s.marketCap, price: s.price, beta: s.beta, volume: s.volume, lastDividend: s.lastAnnualDividend, country: s.country }))
  })
}
export async function sectorPe() {
  return cached('fmp:sectorpe', TTL.calendar, async () => {
    const arr = await get('/sector-pe-snapshot', { date: toISODate(new Date()), exchange: 'NASDAQ' }).catch(() => [])
    return Object.fromEntries((arr || []).map((s) => [s.sector, Number(s.pe)]))
  })
}
export async function socialSentiment(symbol) {
  return cached(`fmp:social:${symbol}`, TTL.trending, async () => {
    const arr = await get('/historical-social-sentiment', { symbol, limit: 1 }).catch(() => [])
    const s = first(arr)
    if (!s) return null
    const bullish = Math.round((s.stocktwitsSentiment ?? s.twitterSentiment ?? 0.5) * 100)
    return { symbol, bullish, bearish: 100 - bullish, messageVolume: s.stocktwitsPosts ?? s.twitterPosts ?? null, watchers: null, messages: [], source: 'fmp' }
  })
}
