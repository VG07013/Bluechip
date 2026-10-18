/**
 * Demo data provider.
 * Generates deterministic, plausible data for the curated universe so Bluechip renders
 * completely without any API key. Every function returns the same normalized shapes
 * that the live providers (fmp.js / polygon.js) are mapped into — see data/index.js.
 */
import { STOCKS, ETFS, INDEXES, ALL_SYMBOLS, lookup } from './universe'
import { rng, between, gauss, hashString } from '../lib/seed'
import { sma, rsi, atr, volatility, perf, perfYTD } from '../lib/indicators'
import { toISODate } from '../lib/format'

const memo = new Map()
const once = (key, fn) => { if (!memo.has(key)) memo.set(key, fn()); return memo.get(key) }
const today = () => toISODate(new Date())
const dayKey = () => today()

/** Sector-level economics used to make the numbers plausible. */
const SECTOR_PROFILE = {
  'Technology': { ps: [5, 12], gm: [45, 75], om: [18, 40], growth: [6, 30], pe: 32, div: 0.4 },
  'Communication Services': { ps: [2, 7], gm: [40, 70], om: [12, 35], growth: [3, 20], pe: 22, div: 1.2 },
  'Consumer Cyclical': { ps: [1, 4], gm: [25, 50], om: [6, 18], growth: [2, 18], pe: 24, div: 1.0 },
  'Consumer Defensive': { ps: [1, 3], gm: [30, 55], om: [8, 20], growth: [1, 8], pe: 23, div: 2.6 },
  'Healthcare': { ps: [3, 8], gm: [55, 80], om: [15, 35], growth: [2, 20], pe: 25, div: 1.8 },
  'Financial': { ps: [2, 6], gm: [50, 90], om: [25, 45], growth: [2, 14], pe: 14, div: 2.4 },
  'Industrials': { ps: [1.2, 4], gm: [22, 40], om: [8, 20], growth: [2, 12], pe: 21, div: 1.6 },
  'Energy': { ps: [0.8, 2.5], gm: [20, 40], om: [8, 22], growth: [-8, 12], pe: 12, div: 3.5 },
  'Utilities': { ps: [2, 4], gm: [35, 55], om: [15, 28], growth: [1, 7], pe: 18, div: 3.4 },
  'Real Estate': { ps: [6, 14], gm: [60, 80], om: [25, 45], growth: [2, 10], pe: 38, div: 4.0 },
  'Basic Materials': { ps: [1, 4], gm: [25, 45], om: [10, 24], growth: [-5, 12], pe: 17, div: 2.0 },
}
export const SECTOR_PE = Object.fromEntries(Object.entries(SECTOR_PROFILE).map(([k, v]) => [k, v.pe]))

/* ---------------------------------------------------------------- prices */

/** 10 years of daily OHLCV bars, generated backwards from today's price. */
export function history(symbol) {
  const meta0 = lookup(symbol)
  if (!meta0) return null
  return once('hist:' + symbol, () => {
    const meta = lookup(symbol)
    const base = meta?.basePrice ?? 50
    const r = rng('hist:' + symbol)
    const dayR = rng('day:' + symbol + ':' + dayKey())
    const todayChange = gauss(dayR) * 1.6 // today's % move
    const vol = meta?.type === 'index' ? 0.009 : meta?.type === 'etf' ? 0.01 : between(r, 0.012, 0.03)
    const drift = between(r, -0.0002, 0.0009)
    const n = 252 * 10
    const closes = new Array(n)
    closes[n - 1] = base * (1 + todayChange / 100)
    for (let i = n - 2; i >= 0; i--) {
      const ret = drift + gauss(r) * vol
      closes[i] = Math.max(0.5, closes[i + 1] / (1 + ret))
    }
    const bars = []
    let d = new Date()
    d.setHours(0, 0, 0, 0)
    // walk back over trading days (skip weekends)
    const dates = []
    let cursor = new Date(d)
    while (dates.length < n) {
      const dow = cursor.getDay()
      if (dow !== 0 && dow !== 6) dates.push(new Date(cursor))
      cursor.setDate(cursor.getDate() - 1)
    }
    dates.reverse()
    const baseVol = meta?.baseCap ? Math.max(5e5, meta.baseCap / (base * 400)) : 2e6
    for (let i = 0; i < n; i++) {
      const c = closes[i]
      const o = i === 0 ? c : closes[i - 1] * (1 + gauss(r) * vol * 0.4)
      const hi = Math.max(o, c) * (1 + Math.abs(gauss(r)) * vol * 0.6)
      const lo = Math.min(o, c) * (1 - Math.abs(gauss(r)) * vol * 0.6)
      const v = Math.round(baseVol * (0.6 + Math.abs(gauss(r)) * 0.9 + Math.abs(c - o) / c * 20))
      bars.push({ time: toISODate(dates[i]), open: +o.toFixed(2), high: +hi.toFixed(2), low: +lo.toFixed(2), close: +c.toFixed(2), volume: v })
    }
    return bars
  })
}

/** Today's 5-minute bars (78 of them). */
export function intraday(symbol) {
  if (!lookup(symbol)) return null
  return once('intra:' + symbol + dayKey(), () => {
    const bars = history(symbol)
    const prev = bars[bars.length - 2].close
    const last = bars[bars.length - 1].close
    const r = rng('intra:' + symbol + dayKey())
    const n = 78
    const out = []
    const start = new Date(); start.setHours(9, 30, 0, 0)
    let p = prev * (1 + gauss(r) * 0.003)
    for (let i = 0; i < n; i++) {
      const target = prev + (last - prev) * (i / (n - 1))
      p = p + (target - p) * 0.25 + gauss(r) * prev * 0.0015
      const t = new Date(start.getTime() + i * 5 * 60000)
      const o = i === 0 ? p : out[i - 1].close
      out.push({ time: Math.floor(t.getTime() / 1000), open: +o.toFixed(2), high: +Math.max(o, p).toFixed(2), low: +Math.min(o, p).toFixed(2), close: +p.toFixed(2), volume: Math.round(between(r, 2e5, 1.5e6)) })
    }
    out[n - 1].close = last
    return out
  })
}

export function quote(symbol) {
  const meta = lookup(symbol)
  if (!meta) return null
  const bars = history(symbol)
  const last = bars[bars.length - 1], prev = bars[bars.length - 2]
  const closes = bars.map((b) => b.close)
  const yr = bars.slice(-252)
  const shares = meta.baseCap ? meta.baseCap / meta.basePrice : null
  const avgVolume = Math.round(bars.slice(-90).reduce((a, b) => a + b.volume, 0) / 90)
  return {
    symbol: meta.symbol, name: meta.name, exchange: meta.exchange || 'INDEX',
    price: last.close, change: +(last.close - prev.close).toFixed(2), changePct: +(((last.close - prev.close) / prev.close) * 100).toFixed(2),
    open: last.open, prevClose: prev.close, dayLow: last.low, dayHigh: last.high,
    volume: last.volume, avgVolume,
    marketCap: shares ? shares * last.close : null,
    yearHigh: Math.max(...yr.map((b) => b.high)), yearLow: Math.min(...yr.map((b) => b.low)),
    sma50: sma(closes, 50).at(-1), sma200: sma(closes, 200).at(-1),
    sharesOutstanding: shares,
    timestamp: Date.now(),
  }
}

/* ------------------------------------------------------------ financials */

export function financials(symbol, period = 'annual') {
  return once(`fin:${symbol}:${period}`, () => {
    const meta = lookup(symbol)
    if (!meta || meta.type !== 'stock') return []
    const r = rng('fin:' + symbol)
    const sp = SECTOR_PROFILE[meta.sector]
    const ps = between(r, sp.ps[0], sp.ps[1])
    const gm = between(r, sp.gm[0], sp.gm[1]) / 100
    const om = Math.min(gm - 0.05, between(r, sp.om[0], sp.om[1]) / 100)
    const growth = between(r, sp.growth[0], sp.growth[1]) / 100
    const shares0 = meta.baseCap / meta.basePrice
    const buyback = between(r, -0.04, 0.01) // negative = share count shrinking
    const revenueNow = meta.baseCap / ps
    const years = 6
    const year = new Date().getFullYear()
    const annual = []
    for (let i = years - 1; i >= 0; i--) {
      const g = growth + gauss(r) * 0.04
      const rev = revenueNow / Math.pow(1 + growth, i) * (1 + gauss(r) * 0.03)
      const gmY = gm + gauss(r) * 0.02 + (i * -0.004) // margins drifting a bit
      const omY = om + gauss(r) * 0.02 - i * 0.006
      const netMargin = omY * between(r, 0.72, 0.85)
      const shares = shares0 * Math.pow(1 + buyback, -i)
      const ni = rev * netMargin
      const ocf = ni * between(r, 1.1, 1.6)
      const capex = rev * between(r, 0.03, 0.09)
      const debt = rev * between(r, 0.2, 0.9)
      const cash = rev * between(r, 0.08, 0.35)
      const equity = rev * between(r, 0.4, 1.2)
      const assets = equity + debt + rev * between(r, 0.3, 0.8)
      annual.push({
        date: `${year - i - 1}-12-31`, period: 'FY', fiscalYear: year - i - 1,
        revenue: rev, grossProfit: rev * gmY, operatingIncome: rev * omY, netIncome: ni,
        eps: ni / shares, sharesOutstanding: shares, totalDebt: debt, longTermDebt: debt * 0.8, cash,
        operatingCashFlow: ocf, capex, freeCashFlow: ocf - capex, equity, totalAssets: assets,
        currentAssets: cash + rev * 0.2, currentLiabilities: rev * between(r, 0.15, 0.3), inventory: rev * 0.05,
        growth: g,
      })
    }
    if (period === 'annual') return annual
    // quarterly: split the most recent two fiscal years with seasonality
    const q = []
    const lastTwo = annual.slice(-2)
    const season = [0.23, 0.24, 0.25, 0.28]
    lastTwo.forEach((y) => {
      season.forEach((s, qi) => {
        const f = s * (1 + gauss(r) * 0.02)
        const m = (qi + 1) * 3
        q.push({
          date: `${y.fiscalYear}-${String(m).padStart(2, '0')}-${m === 6 || m === 9 ? '30' : '31'}`,
          period: `Q${qi + 1}`, fiscalYear: y.fiscalYear,
          revenue: y.revenue * f, grossProfit: y.grossProfit * f, operatingIncome: y.operatingIncome * f,
          netIncome: y.netIncome * f, eps: y.eps * f, sharesOutstanding: y.sharesOutstanding,
          totalDebt: y.totalDebt, longTermDebt: y.longTermDebt, cash: y.cash * (0.9 + qi * 0.04),
          operatingCashFlow: y.operatingCashFlow * f, capex: y.capex * f, freeCashFlow: y.freeCashFlow * f,
          equity: y.equity, totalAssets: y.totalAssets, currentAssets: y.currentAssets, currentLiabilities: y.currentLiabilities,
        })
      })
    })
    return q
  })
}

/* ------------------------------------------------------------- snapshot */

const DESCRIPTIONS = {
  AAPL: 'Apple designs, manufactures and markets smartphones, personal computers, tablets, wearables and accessories, and sells a range of related services including the App Store, iCloud, Apple Music and Apple Pay.',
  MSFT: 'Microsoft develops and supports software, services, devices and solutions. Its segments include Productivity and Business Processes (Office, LinkedIn), Intelligent Cloud (Azure, servers) and More Personal Computing (Windows, Xbox, Surface).',
  NVDA: 'NVIDIA designs graphics processing units and system-on-chip units for gaming, professional visualization, data centers and automotive markets. Its data-center GPUs power most modern AI training and inference.',
  AMZN: 'Amazon is an online retailer, a cloud infrastructure provider through Amazon Web Services, and an advertising and subscription business through Prime.',
  GOOGL: 'Alphabet is the parent of Google, which earns most of its revenue from search and YouTube advertising, with growing contributions from Google Cloud and subscriptions.',
  TSLA: 'Tesla designs, manufactures and sells electric vehicles, energy storage and solar products, and develops software for driver assistance.',
  META: 'Meta operates Facebook, Instagram, WhatsApp and Messenger, earning nearly all revenue from advertising, while investing heavily in AI and virtual reality through Reality Labs.',
}
function describe(meta) {
  if (DESCRIPTIONS[meta.symbol]) return DESCRIPTIONS[meta.symbol]
  return `${meta.name} operates in the ${meta.industry.toLowerCase()} industry within the ${meta.sector.toLowerCase()} sector. The company serves customers across the United States and international markets and is listed on the ${meta.exchange}.`
}

/** Full snapshot: profile + quote + every Finviz metric. */
export function snapshot(symbol) {
  const meta = lookup(symbol)
  if (!meta) return null
  return once('snap:' + symbol + dayKey(), () => {
    const q = quote(symbol)
    const bars = history(symbol)
    const closes = bars.map((b) => b.close)
    const r = rng('snap:' + symbol)
    const m = {}
    // technicals from price history (same as live mode)
    const tech = technicals(bars, q)
    Object.assign(m, tech)
    m.price = q.price; m.change = q.changePct; m.prevClose = q.prevClose; m.volume = q.volume; m.avgVolume = q.avgVolume
    m.relVolume = +(q.volume / q.avgVolume).toFixed(2)
    m.marketCap = q.marketCap
    m.exchange = meta.exchange; m.country = meta.country || 'USA'
    m.beta = meta.type === 'index' ? null : +between(r, 0.5, 1.9).toFixed(2)

    if (meta.type !== 'stock') {
      return { ...meta, description: `${meta.name} (${meta.symbol}).`, logo: null, quote: q, metrics: m, source: 'demo' }
    }
    const A = financials(symbol, 'annual')
    const Q = financials(symbol, 'quarter')
    const cur = A.at(-1), prev = A.at(-2), five = A[0]
    const ttm = Q.slice(-4)
    const sum = (arr, k) => arr.reduce((a, b) => a + b[k], 0)
    const sales = sum(ttm, 'revenue'), income = sum(ttm, 'netIncome'), epsTTM = sum(ttm, 'eps')
    const prevTTM = Q.slice(-8, -4)
    const shares = cur.sharesOutstanding
    const sp = SECTOR_PROFILE[meta.sector]
    const divYield = Math.max(0, sp.div + gauss(r) * 1.2) / 100
    const epsNextYGrowth = cur.growth * between(r, 0.8, 1.3)
    m.sector = meta.sector; m.industry = meta.industry; m.employees = meta.employees; m.index = meta.index
    m.optionShort = 'Yes / Yes'
    m.sales = sales; m.income = income; m.eps = epsTTM
    m.salesYoY = ((sales - sum(prevTTM, 'revenue')) / sum(prevTTM, 'revenue')) * 100
    m.salesQoQ = ((Q.at(-1).revenue - Q.at(-5).revenue) / Q.at(-5).revenue) * 100
    m.salesPast5Y = (Math.pow(cur.revenue / five.revenue, 1 / 5) - 1) * 100
    m.epsYoY = ((epsTTM - sum(prevTTM, 'eps')) / Math.abs(sum(prevTTM, 'eps'))) * 100
    m.earningsQoQ = ((Q.at(-1).netIncome - Q.at(-5).netIncome) / Math.abs(Q.at(-5).netIncome)) * 100
    m.epsThisY = ((cur.eps - prev.eps) / Math.abs(prev.eps)) * 100
    m.epsNextY = epsTTM * (1 + epsNextYGrowth)
    m.epsNextQ = Q.at(-1).eps * (1 + epsNextYGrowth / 2)
    m.epsNext5Y = epsNextYGrowth * 100 * between(r, 0.7, 1.1)
    m.epsPast5Y = (Math.pow(Math.max(0.01, cur.eps) / Math.max(0.01, five.eps), 1 / 5) - 1) * 100
    m.pe = epsTTM > 0 ? q.price / epsTTM : null
    m.forwardPe = m.epsNextY > 0 ? q.price / m.epsNextY : null
    m.peg = m.pe && m.epsNext5Y > 0 ? m.pe / m.epsNext5Y : null
    m.ps = q.marketCap / sales
    m.pb = q.marketCap / cur.equity
    m.pc = q.marketCap / cur.cash
    m.pfcf = cur.freeCashFlow > 0 ? q.marketCap / sum(ttm, 'freeCashFlow') : null
    m.bookPerShare = cur.equity / shares
    m.cashPerShare = cur.cash / shares
    m.dividendTTM = divYield > 0.002 ? +(q.price * divYield).toFixed(2) : 0
    m.dividendEst = m.dividendTTM ? +(m.dividendTTM * 1.04).toFixed(2) : 0
    m.dividendYield = divYield * 100
    m.payout = m.dividendTTM && epsTTM > 0 ? (m.dividendTTM / epsTTM) * 100 : 0
    if (m.dividendTTM) {
      const ex = new Date(); ex.setDate(ex.getDate() + Math.round(between(r, -40, 50)))
      m.dividendExDate = toISODate(ex)
    } else m.dividendExDate = null
    m.roa = (income / cur.totalAssets) * 100
    m.roe = (income / cur.equity) * 100
    m.roic = (cur.operatingIncome * 0.79 / (cur.equity + cur.totalDebt - cur.cash)) * 100
    m.grossMargin = (sum(ttm, 'grossProfit') / sales) * 100
    m.operMargin = (sum(ttm, 'operatingIncome') / sales) * 100
    m.profitMargin = (income / sales) * 100
    m.currentRatio = cur.currentAssets / cur.currentLiabilities
    m.quickRatio = (cur.currentAssets - cur.inventory) / cur.currentLiabilities
    m.debtEq = cur.totalDebt / cur.equity
    m.ltDebtEq = cur.longTermDebt / cur.equity
    m.sharesOutstanding = shares
    m.sharesOutstandingYoY = ((cur.sharesOutstanding - prev.sharesOutstanding) / prev.sharesOutstanding) * 100
    m.sharesFloat = shares * between(r, 0.82, 0.99)
    m.insiderOwn = between(r, 0.05, 12)
    m.insiderTrans = gauss(r) * 4
    m.instOwn = between(r, 55, 92)
    m.instTrans = gauss(r) * 2
    m.shortFloat = between(r, 0.4, 6)
    m.shortRatio = between(r, 0.8, 5)
    m.shortInterest = (m.sharesFloat * m.shortFloat) / 100
    m.recom = +between(r, 1.4, 3.2).toFixed(2)
    m.targetPrice = +(q.price * between(r, 0.92, 1.35)).toFixed(2)
    const earn = nextEarningsDate(symbol)
    m.earningsDate = `${earn.date} ${earn.time === 'bmo' ? 'BMO' : 'AMC'}`
    m.earningsDateISO = earn.date
    return {
      symbol: meta.symbol, name: meta.name, exchange: meta.exchange, sector: meta.sector, industry: meta.industry,
      country: meta.country, employees: meta.employees, index: meta.index, type: meta.type,
      description: describe(meta), logo: null, website: null, ceo: null,
      quote: q, metrics: m, source: 'demo',
    }
  })
}

/** Price-derived technicals; shared with live mode via data/index.js. */
export function technicals(bars, q) {
  const closes = bars.map((b) => b.close)
  const last = closes.at(-1)
  const s20 = sma(closes, 20).at(-1), s50 = sma(closes, 50).at(-1), s200 = sma(closes, 200).at(-1)
  const yr = bars.slice(-252)
  const hi = Math.max(...yr.map((b) => b.high)), lo = Math.min(...yr.map((b) => b.low))
  const pct = (a, b) => (a && b ? ((a - b) / b) * 100 : null)
  return {
    perfWeek: perf(closes, 5), perfMonth: perf(closes, 21), perfQuarter: perf(closes, 63), perfHalfY: perf(closes, 126),
    perfYear: perf(closes, 252), perfYTD: perfYTD(bars),
    atr: atr(bars, 14), volatilityWeek: volatility(bars, 5), volatilityMonth: volatility(bars, 21),
    rsi: rsi(closes, 14).at(-1),
    sma20: pct(last, s20), sma50: pct(last, s50), sma200: pct(last, s200),
    high52: pct(last, hi), low52: pct(last, lo), range52: `${lo.toFixed(2)} – ${hi.toFixed(2)}`,
    high52Abs: hi, low52Abs: lo,
  }
}

/** 5 years of annual P/E for valuation context. */
export function peHistory(symbol) {
  const A = financials(symbol, 'annual')
  const bars = history(symbol)
  return A.slice(-5).map((y) => {
    const bar = bars.find((b) => b.time >= y.date) || bars.at(-1)
    return { year: y.fiscalYear, pe: y.eps > 0 ? bar.close / y.eps : null }
  }).filter((x) => x.pe)
}

/* ------------------------------------------------------------- earnings */

export function nextEarningsDate(symbol) {
  const r = rng('earn:' + symbol)
  const offset = Math.round(between(r, 12, 42)) // days after quarter end
  const time = r() > 0.5 ? 'amc' : 'bmo'
  const now = new Date()
  // find next report date after today
  for (let k = -1; k < 6; k++) {
    const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3 * k, 0)
    const d = new Date(qEnd); d.setDate(d.getDate() + offset)
    if (d >= now) return { date: toISODate(d), time }
  }
  return { date: toISODate(now), time }
}

export function earningsHistory(symbol) {
  return once('earnhist:' + symbol, () => {
    const Q = financials(symbol, 'quarter')
    const r = rng('earnhist:' + symbol)
    const { time } = nextEarningsDate(symbol)
    return Q.map((q) => {
      const est = q.eps * (1 + gauss(r) * 0.06)
      const revEst = q.revenue * (1 + gauss(r) * 0.02)
      const d = new Date(q.date); d.setDate(d.getDate() + Math.round(between(r, 20, 35)))
      return {
        date: toISODate(d), period: `${q.period} ${q.fiscalYear}`, time,
        epsEstimate: est, epsActual: q.eps, revenueEstimate: revEst, revenueActual: q.revenue,
        surprisePct: ((q.eps - est) / Math.abs(est)) * 100,
      }
    }).reverse()
  })
}

const FIRMS = ['Morgan Stanley', 'Goldman Sachs', 'JPMorgan', 'Bank of America', 'Wells Fargo', 'Barclays', 'UBS', 'Citi', 'Jefferies', 'Piper Sandler', 'Bernstein', 'Evercore ISI']
const RATINGS = ['Strong Buy', 'Buy', 'Hold', 'Sell']
export function analyst(symbol) {
  return once('analyst:' + symbol, () => {
    const snap = snapshot(symbol)
    if (!snap || snap.type !== 'stock') return null
    const r = rng('analyst:' + symbol)
    const price = snap.quote.price
    const n = Math.round(between(r, 12, 45))
    const bull = (3.2 - snap.metrics.recom) / 1.8 // 0..1
    const strongBuy = Math.round(n * bull * 0.45), buy = Math.round(n * bull * 0.4)
    const sell = Math.round(n * (1 - bull) * 0.15), strongSell = Math.round(n * (1 - bull) * 0.05)
    const hold = Math.max(0, n - strongBuy - buy - sell - strongSell)
    const mean = snap.metrics.targetPrice
    const history = []
    let t = mean * 0.8
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      t = t * (1 + gauss(r) * 0.04) + (mean - t) * 0.2
      history.push({ date: toISODate(d), target: +t.toFixed(2), price: +(price * (1 + gauss(r) * 0.12 - i * 0.01)).toFixed(2) })
    }
    const actions = []
    for (let i = 0; i < 8; i++) {
      const d = new Date(); d.setDate(d.getDate() - Math.round(between(r, 2, 120)))
      const to = RATINGS[Math.min(3, Math.floor(r() * 3 + (1 - bull)))]
      const from = RATINGS[Math.min(3, Math.max(0, RATINGS.indexOf(to) + (r() > 0.5 ? 1 : -1)))]
      actions.push({ date: toISODate(d), firm: FIRMS[Math.floor(r() * FIRMS.length)], action: r() > 0.6 ? 'Upgrade' : r() > 0.3 ? 'Reiterated' : 'Downgrade', from, to, target: +(mean * between(r, 0.85, 1.2)).toFixed(2) })
    }
    actions.sort((a, b) => (a.date < b.date ? 1 : -1))
    return {
      consensus: snap.metrics.recom < 1.8 ? 'Strong Buy' : snap.metrics.recom < 2.5 ? 'Buy' : snap.metrics.recom < 3.2 ? 'Hold' : 'Sell',
      score: snap.metrics.recom, counts: { strongBuy, buy, hold, sell, strongSell }, total: n,
      target: { low: +(mean * 0.78).toFixed(2), high: +(mean * 1.28).toFixed(2), mean, median: +(mean * 1.01).toFixed(2) },
      history, actions,
    }
  })
}

const FIRST = ['Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Karen', 'James', 'Amy', 'Daniel', 'Priya', 'Luis']
const LAST = ['Chen', 'Patel', 'Johnson', 'Williams', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas']
const TITLES = ['CEO', 'CFO', 'COO', 'Director', 'EVP, Operations', 'SVP, Engineering', 'General Counsel', 'Chief Accounting Officer', '10% Owner']
export function insiderTrades(symbol) {
  return once('insider:' + symbol, () => {
    const snap = snapshot(symbol)
    if (!snap || snap.type !== 'stock') return []
    const r = rng('insider:' + symbol)
    const price = snap.quote.price
    const rows = []
    const n = Math.round(between(r, 8, 16))
    for (let i = 0; i < n; i++) {
      const d = new Date(); d.setDate(d.getDate() - Math.round(between(r, 1, 180)))
      const type = r() < 0.3 ? 'Buy' : r() < 0.8 ? 'Sale' : 'Option Exercise'
      const shares = Math.round(between(r, 500, 60000))
      const p = +(price * between(r, 0.8, 1.05)).toFixed(2)
      rows.push({ date: toISODate(d), name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`, title: TITLES[Math.floor(r() * TITLES.length)], type, shares, price: p, value: shares * p })
    }
    rows.sort((a, b) => (a.date < b.date ? 1 : -1))
    return rows
  })
}

/* ----------------------------------------------------------------- news */

const HEADLINES = [
  '{name} shares {dir} after {q} results top expectations',
  'Analysts weigh in on {name} ahead of earnings',
  '{name} announces expanded partnership in {industry}',
  'Why {name} could be a long-term winner, according to one fund manager',
  '{name} unveils new product line targeting enterprise customers',
  'Is {name} stock a buy after its recent move?',
  '{name} CFO to speak at upcoming investor conference',
  '{name} raises full-year guidance on strong demand',
  'Institutional investors trim stakes in {name}, filings show',
  '{name} faces pricing pressure as competition intensifies',
  '{sector} stocks rally as rates ease; {name} among leaders',
  '{name} board authorizes new share repurchase program',
]
const SOURCES = ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'The Wall Street Journal', 'Barron\'s', 'Seeking Alpha', 'Yahoo Finance']
export function news(symbol, count = 10) {
  const key = 'news:' + (symbol || 'market') + dayKey()
  return once(key, () => {
    const r = rng(key)
    const pool = symbol ? [lookup(symbol)].filter(Boolean) : STOCKS.slice(0, 40)
    const out = []
    for (let i = 0; i < count; i++) {
      const meta = pool[Math.floor(r() * pool.length)]
      if (!meta) break
      const tpl = HEADLINES[Math.floor(r() * HEADLINES.length)]
      const q = ['Q1', 'Q2', 'Q3', 'Q4'][Math.floor(r() * 4)]
      const title = tpl.replace('{name}', meta.name.replace(/,? Inc\.?|Corporation|Company|plc/g, '').trim())
        .replace('{dir}', r() > 0.5 ? 'climb' : 'slip').replace('{q}', q)
        .replace('{industry}', (meta.industry || '').toLowerCase()).replace('{sector}', meta.sector || 'Market')
      const d = new Date(); d.setMinutes(d.getMinutes() - Math.round(between(r, 10, 60 * 36)))
      out.push({
        id: hashString(title + d.toISOString()).toString(36), symbol: meta.symbol, title,
        source: SOURCES[Math.floor(r() * SOURCES.length)], url: '#', publishedAt: d.toISOString(),
        summary: `${meta.name} was in focus as investors digested the latest developments in the ${(meta.industry || 'market').toLowerCase()} space.`,
        sentiment: r() > 0.45 ? 'Bullish' : 'Bearish',
      })
    }
    return out.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
  })
}

/* ------------------------------------------------------- market lists */

export function allStockSnapshots() {
  return STOCKS.map((s) => snapshot(s.symbol))
}
export function gainers(n = 10) {
  return allStockSnapshots().sort((a, b) => b.quote.changePct - a.quote.changePct).slice(0, n).map(toMover)
}
export function losers(n = 10) {
  return allStockSnapshots().sort((a, b) => a.quote.changePct - b.quote.changePct).slice(0, n).map(toMover)
}
const toMover = (s) => ({ symbol: s.symbol, name: s.name, price: s.quote.price, change: s.quote.change, changePct: s.quote.changePct, volume: s.quote.volume })

export function indexQuotes() {
  return INDEXES.map((i) => ({ ...quote(i.symbol), short: i.short }))
}

export function peers(symbol) {
  const meta = lookup(symbol)
  if (!meta || meta.type !== 'stock') return []
  const same = STOCKS.filter((s) => s.industry === meta.industry && s.symbol !== symbol).map((s) => s.symbol)
  const sector = STOCKS.filter((s) => s.sector === meta.sector && s.symbol !== symbol && !same.includes(s.symbol)).map((s) => s.symbol)
  return [...same, ...sector].slice(0, 6)
}

/* ------------------------------------------------------- StockTwits-ish */

export function trending(n = 10) {
  return once('trending:' + dayKey(), () => {
    const r = rng('trending:' + dayKey())
    const pool = [...STOCKS].sort((a, b) => Math.abs(snapshot(b.symbol).quote.changePct) * (0.6 + r()) - Math.abs(snapshot(a.symbol).quote.changePct) * (0.6 + r()))
    return pool.slice(0, n).map((s) => {
      const snap = snapshot(s.symbol)
      return {
        symbol: s.symbol, name: s.name, price: snap.quote.price, changePct: snap.quote.changePct,
        sparkline: history(s.symbol).slice(-30).map((b) => b.close),
        watchers: Math.round(between(r, 20000, 900000)), messageVolume: Math.round(between(r, 150, 4200)),
      }
    })
  })
}

const MSGS = [
  'Loading up more {s} here. Long-term story intact.', 'Took profits on {s} today, will buy back lower.',
  '{s} breaking out on volume 👀', '{s} chart looks heavy, waiting for a pullback.', 'Earnings next week for {s}, expecting a beat.',
  'Not touching {s} until it reclaims the 50-day.', '{s} is the best run company in its space, period.', 'Dip buyers stepped in fast on {s}.',
  'Short interest climbing on {s}, squeeze setup?', '{s} guidance was weak but the market shrugged.',
]
export function sentiment(symbol) {
  return once('sent:' + symbol + dayKey(), () => {
    const r = rng('sent:' + symbol + dayKey())
    const snap = snapshot(symbol)
    const bullish = Math.round(Math.min(90, Math.max(10, 55 + (snap?.quote.changePct || 0) * 4 + gauss(r) * 12)))
    const messages = []
    for (let i = 0; i < 12; i++) {
      const isBull = r() * 100 < bullish
      const d = new Date(); d.setMinutes(d.getMinutes() - Math.round(between(r, 1, 600)))
      messages.push({ id: i, user: `${FIRST[Math.floor(r() * FIRST.length)].toLowerCase()}_${Math.floor(r() * 999)}`, body: MSGS[Math.floor(r() * MSGS.length)].replace('{s}', '$' + symbol), sentiment: r() > 0.3 ? (isBull ? 'Bullish' : 'Bearish') : null, createdAt: d.toISOString() })
    }
    messages.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return { symbol, bullish, bearish: 100 - bullish, messageVolume: Math.round(between(r, 80, 3000)), watchers: Math.round(between(r, 10000, 800000)), messages, source: 'demo' }
  })
}

/* ------------------------------------------------------------ calendars */

export function earningsCalendar(from, to) {
  const out = []
  STOCKS.forEach((s) => {
    const r = rng('earn:' + s.symbol)
    const offset = Math.round(between(r, 12, 42))
    const time = r() > 0.5 ? 'amc' : 'bmo'
    const start = new Date(from)
    for (let k = -2; k < 6; k++) {
      const qEnd = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3 + 3 * k, 0)
      const d = new Date(qEnd); d.setDate(d.getDate() + offset)
      const iso = toISODate(d)
      if (iso >= from && iso <= to) {
        const snap = snapshot(s.symbol)
        out.push({ date: iso, symbol: s.symbol, name: s.name, time, epsEstimate: snap.metrics.epsNextQ, revenueEstimate: snap.metrics.sales / 4 * (1 + snap.metrics.salesYoY / 100 / 4) })
      }
    }
  })
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.symbol.localeCompare(b.symbol)))
}

export function economicCalendar(from, to) {
  const out = []
  const start = new Date(from), end = new Date(to)
  const push = (d, event, impact, extra = {}) => { const iso = toISODate(d); if (iso >= from && iso <= to) out.push({ date: iso, event, country: 'US', impact, ...extra }) }
  // walk month by month
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cur <= end) {
    const y = cur.getFullYear(), mo = cur.getMonth()
    const r = rng(`econ:${y}-${mo}`)
    const firstFri = (() => { const d = new Date(y, mo, 1); while (d.getDay() !== 5) d.setDate(d.getDate() + 1); return d })()
    push(firstFri, 'Nonfarm Payrolls (Jobs Report)', 'high', { previous: `${Math.round(between(r, 120, 260))}K`, estimate: `${Math.round(between(r, 140, 220))}K`, time: '8:30 AM' })
    push(firstFri, 'Unemployment Rate', 'high', { previous: '4.1%', estimate: '4.1%', time: '8:30 AM' })
    push(new Date(y, mo, 10 + Math.round(r() * 3)), 'Consumer Price Index (CPI)', 'high', { previous: `${between(r, 2.6, 3.4).toFixed(1)}% Y/Y`, estimate: `${between(r, 2.6, 3.2).toFixed(1)}% Y/Y`, time: '8:30 AM' })
    push(new Date(y, mo, 12 + Math.round(r() * 3)), 'Producer Price Index (PPI)', 'medium', { previous: '0.2% M/M', estimate: '0.2% M/M', time: '8:30 AM' })
    push(new Date(y, mo, 15 + Math.round(r() * 2)), 'Retail Sales', 'medium', { previous: '0.4% M/M', estimate: '0.3% M/M', time: '8:30 AM' })
    push(new Date(y, mo, 25 + Math.round(r() * 3)), 'GDP (Advance/Revised)', 'high', { previous: '2.8% Q/Q', estimate: '2.5% Q/Q', time: '8:30 AM' })
    push(new Date(y, mo, 27 + Math.round(r() * 2)), 'PCE Price Index', 'high', { previous: '2.5% Y/Y', estimate: '2.4% Y/Y', time: '8:30 AM' })
    if ([0, 2, 4, 6, 8, 10].includes(mo)) { // FOMC roughly every other month
      const d = new Date(y, mo, 16 + Math.round(r() * 3)); while (d.getDay() !== 3) d.setDate(d.getDate() + 1)
      push(d, 'FOMC Rate Decision (Fed Meeting)', 'high', { previous: '4.25–4.50%', estimate: '4.25–4.50%', time: '2:00 PM' })
    }
    // weekly jobless claims every Thursday
    const d = new Date(y, mo, 1); while (d.getDay() !== 4) d.setDate(d.getDate() + 1)
    while (d.getMonth() === mo) { push(new Date(d), 'Initial Jobless Claims', 'low', { previous: '225K', estimate: '222K', time: '8:30 AM' }); d.setDate(d.getDate() + 7) }
    cur.setMonth(cur.getMonth() + 1)
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** Local search index entries for all known symbols. */
export function searchUniverse() {
  return ALL_SYMBOLS.map((s) => ({ symbol: s.symbol, name: s.name, exchange: s.exchange || 'INDEX', type: s.type, sector: s.sector, industry: s.industry }))
}
export { STOCKS, ETFS, INDEXES }
