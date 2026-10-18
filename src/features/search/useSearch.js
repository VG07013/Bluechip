import { useEffect, useMemo, useRef, useState } from 'react'
import { buildResults } from './searchIndex'
import { searchRemote, getQuotes, getNews, peekSnapshot } from '../../data'
import { recentStore } from './recent'
import { watchlistStore } from '../watchlist/useWatchlist'

let newsCache = null
/**
 * useSearch(query, currentSymbol)
 * - local results are computed synchronously (sub-100ms)
 * - remote symbol search + live quotes are merged in as they arrive
 */
export function useSearch(query, currentSymbol) {
  const recent = recentStore.use()
  const watchlist = watchlistStore.use()
  const [remote, setRemote] = useState([])
  const [quotes, setQuotes] = useState({})
  const [news, setNews] = useState(newsCache || [])
  const seq = useRef(0)

  useEffect(() => { if (!newsCache) getNews(null, 30).then((n) => { newsCache = n; setNews(n) }).catch(() => {}) }, [])

  // remote symbol search (debounced)
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setRemote([]); return }
    const id = ++seq.current
    const t = setTimeout(() => searchRemote(q).then((r) => { if (id === seq.current) setRemote(r) }), 180)
    return () => clearTimeout(t)
  }, [query])

  const groups = useMemo(() => buildResults(query, {
    currentSymbol, recent, watchlist: watchlist.map((w) => w.symbol), news, remote,
    metricsFor: (s) => peekSnapshot(s)?.metrics,
  }), [query, currentSymbol, recent, watchlist, news, remote])

  // live prices for visible stock results
  const symbols = useMemo(() => groups.flatMap((g) => g.items).filter((i) => i.kind === 'stock').map((i) => i.symbol).slice(0, 8), [groups])
  const key = symbols.join(',')
  useEffect(() => {
    if (!key) return
    let alive = true
    const missing = symbols.filter((s) => !quotes[s])
    if (!missing.length) return
    const t = setTimeout(() => getQuotes(missing).then((qs) => { if (!alive) return; setQuotes((prev) => ({ ...prev, ...Object.fromEntries(qs.map((q) => [q.symbol, q])) })) }).catch(() => {}), 120)
    return () => { alive = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])
  return { groups, flat, quotes }
}
