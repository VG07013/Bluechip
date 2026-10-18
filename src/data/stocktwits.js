/**
 * StockTwits data module — trending tickers and per-symbol sentiment / message stream.
 *
 * StockTwits' public API is rate-limited (~200 req/hour unauthenticated) and does NOT send
 * CORS headers, so the browser must call it through a proxy (/api/stocktwits, see vite.config.js).
 * If the call fails for any reason we fall back to FMP (social sentiment + most-active list)
 * and finally to demo data, so the UI always has something sensible to show.
 */
import { API_CONFIG, hasLiveProvider } from '../config/api'
import { cached } from '../lib/cache'
import { getJSON } from './http'
import * as fmp from './fmp'
import * as demo from './demo'

const TTL = API_CONFIG.cacheTtl
const st = (path) => getJSON(`${API_CONFIG.stocktwits.base}${path}`, { timeout: 8000 })

/** Top trending symbols with price + 30-day sparkline (prices come from the price provider). */
export async function trending(n = 10, fetchQuote, fetchHistory) {
  if (!hasLiveProvider()) return demo.trending(n).map((t) => ({ ...t, source: 'demo' }))
  return cached(`st:trending:${n}`, TTL.trending, async () => {
    try {
      const { symbols } = await st('/trending/symbols.json')
      const list = (symbols || []).slice(0, n)
      const enriched = await Promise.all(list.map(async (s) => {
        let q = null, bars = []
        try { q = await fetchQuote(s.symbol) } catch { /* ignore */ }
        try { bars = (await fetchHistory(s.symbol)).slice(-30) } catch { /* ignore */ }
        return { symbol: s.symbol, name: s.title, price: q?.price ?? null, changePct: q?.changePct ?? null, sparkline: bars.map((b) => b.close), watchers: s.watchlist_count, messageVolume: null, source: 'stocktwits' }
      }))
      return enriched
    } catch (e) {
      // Fallback 1: FMP "most active" as a proxy for trending
      if (API_CONFIG.stocktwits.fallback === 'fmp' && hasLiveProvider() && API_CONFIG.provider === 'fmp') {
        try {
          const act = await fmp.mostActive()
          return await Promise.all(act.slice(0, n).map(async (m) => {
            let bars = []
            try { bars = (await fetchHistory(m.symbol)).slice(-30) } catch { /* ignore */ }
            return { ...m, sparkline: bars.map((b) => b.close), watchers: null, messageVolume: null, source: 'fmp-most-active' }
          }))
        } catch { /* fall through */ }
      }
      // Fallback 2: demo
      return demo.trending(n).map((t) => ({ ...t, source: 'demo' }))
    }
  })
}

/** Sentiment gauge (% bullish of recently tagged messages) + the live message feed. */
export async function sentiment(symbol) {
  return cached(`st:sent:${symbol}`, TTL.trending, async () => {
    try {
      const data = await st(`/streams/symbol/${encodeURIComponent(symbol)}.json?limit=30`)
      const msgs = (data.messages || []).map((m) => ({ id: m.id, user: m.user?.username, avatar: m.user?.avatar_url, body: m.body, sentiment: m.entities?.sentiment?.basic || null, createdAt: m.created_at }))
      const tagged = msgs.filter((m) => m.sentiment)
      const bull = tagged.filter((m) => m.sentiment === 'Bullish').length
      const bullish = tagged.length ? Math.round((bull / tagged.length) * 100) : null
      return { symbol, bullish, bearish: bullish == null ? null : 100 - bullish, messageVolume: msgs.length, watchers: data.symbol?.watchlist_count ?? null, messages: msgs, source: 'stocktwits' }
    } catch (e) {
      if (API_CONFIG.stocktwits.fallback === 'fmp' && hasLiveProvider() && API_CONFIG.provider === 'fmp') {
        try { const s = await fmp.socialSentiment(symbol); if (s) return s } catch { /* fall through */ }
      }
      return demo.sentiment(symbol)
    }
  })
}

/** Quick label for a headline's ticker. Uses cached sentiment; returns null if unknown. */
export async function sentimentLabel(symbol) {
  try {
    const s = await sentiment(symbol)
    if (s.bullish == null) return null
    return s.bullish >= 50 ? 'Bullish' : 'Bearish'
  } catch { return null }
}
