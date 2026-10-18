/**
 * Builds grouped search results synchronously from local indexes (universe, metrics,
 * sections, sectors/industries, commands, news). Remote symbol results and live
 * prices are merged in by useSearch.
 */
import { searchLocal, lookup } from '../../data'
import { FIELDS, SECTIONS } from '../stock/snapshotFields'
import { SECTORS, INDUSTRIES, STOCKS } from '../../data/universe'
import { score, norm } from '../../lib/fuzzy'
import { parseCommand } from './commands'

const universe = searchLocal()
const TICKER_RE = /^[A-Z^.]{1,6}$/

function matchSymbols(q, limit = 8) {
  const n = norm(q)
  const scored = []
  for (const s of universe) {
    const bySym = score(n, s.symbol.replace('^', '')) * 1.05
    const byName = score(n, s.name)
    const byMeta = Math.max(score(n, s.sector || ''), score(n, s.industry || '')) * 0.6
    const sc = Math.max(bySym, byName, byMeta)
    if (sc > 0.3) scored.push({ ...s, score: sc, matchedOn: bySym >= byName ? 'symbol' : byName >= byMeta ? 'name' : 'meta' })
  }
  return scored.sort((a, b) => b.score - a.score || (b.symbol.length < a.symbol.length ? 1 : -1)).slice(0, limit)
}

function matchMetrics(q, limit = 5) {
  const n = norm(q)
  return FIELDS.map((f) => ({ f, s: Math.max(score(n, f.label), score(n, f.key), ...f.aliases.map((a) => score(n, a))) }))
    .filter((x) => x.s > 0.5).sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.f)
}
function matchSections(q, limit = 4) {
  const n = norm(q)
  return SECTIONS.map((s) => ({ s, sc: Math.max(score(n, s.label), ...s.aliases.map((a) => score(n, a))) })).filter((x) => x.sc > 0.55).sort((a, b) => b.sc - a.sc).slice(0, limit).map((x) => x.s)
}
function matchTaxonomy(q, limit = 4) {
  const n = norm(q)
  const out = []
  SECTORS.forEach((s) => { const sc = score(n, s); if (sc > 0.55) out.push({ kind: 'sector', name: s, score: sc, count: STOCKS.filter((x) => x.sector === s).length }) })
  INDUSTRIES.forEach((s) => { const sc = score(n, s); if (sc > 0.55) out.push({ kind: 'industry', name: s, score: sc, count: STOCKS.filter((x) => x.industry === s).length }) })
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Main entry. Returns an array of groups: { id, label, items:[{ id, title, subtitle, to, symbol?, kind }] }.
 * ctx: { currentSymbol, recent, watchlist, news, remote }
 */
export function buildResults(query, ctx = {}) {
  const q = query.trim()
  const groups = []
  const push = (id, label, items) => { if (items.length) groups.push({ id, label, items }) }

  if (!q) {
    // Pre-typed state: recent searches + watchlist
    push('recent', 'Recent', (ctx.recent || []).slice(0, 6).map((r) => ({ id: 'r:' + r.symbol, kind: 'stock', symbol: r.symbol, title: r.symbol, subtitle: r.name, to: `/stock/${r.symbol}` })))
    push('watchlist', 'Watchlist', (ctx.watchlist || []).slice(0, 6).map((s) => ({ id: 'w:' + s, kind: 'stock', symbol: s, title: s, subtitle: lookup(s)?.name || '', to: `/stock/${s}` })))
    return groups
  }

  // 1) Commands
  const cmd = parseCommand(q)
  if (cmd) push('commands', 'Commands', [{ id: 'cmd', kind: 'command', title: cmd.title, subtitle: cmd.subtitle, to: cmd.to }])

  // 2) "TICKER metric" / "TICKER section"  e.g. "AAPL ROE", "msft insider trading"
  const tokens = q.split(/\s+/)
  const first = tokens[0].toUpperCase()
  const rest = tokens.slice(1).join(' ')
  const targetFromQuery = tokens.length > 1 && TICKER_RE.test(first) && lookup(first) ? first : null
  const target = targetFromQuery || ctx.currentSymbol || null
  const metricQuery = targetFromQuery ? rest : q
  const metricItems = []
  if (metricQuery) {
    const metrics = matchMetrics(metricQuery)
    metrics.forEach((f) => {
      const value = target && ctx.metricsFor?.(target)?.[f.key]
      metricItems.push({
        id: 'm:' + f.key, kind: 'metric', field: f, symbol: target,
        title: target ? `${f.label} · ${target}` : f.label,
        subtitle: target ? (value != null ? `Jump to ${f.label} on ${target}` : `Jump to ${f.label} on ${target}`) : `Pick a stock to see ${f.label}, or sort the screener by it`,
        to: target ? `/stock/${target}#${f.key}` : `/screener?sort=${f.key}`,
        value,
      })
    })
    const sections = matchSections(metricQuery)
    push('sections', target ? `Sections on ${target}` : 'Sections', sections.map((s) => ({ id: 's:' + s.id, kind: 'section', title: s.label, subtitle: target ? `Jump to ${s.label} on ${target}` : `Open ${s.label} on the last viewed stock`, to: target ? `/stock/${target}#${s.id}` : (ctx.recent?.[0] ? `/stock/${ctx.recent[0].symbol}#${s.id}` : '/') })))
  }
  push('metrics', 'Metrics', metricItems)

  // 3) Stocks + ETFs/indexes (local + remote)
  const local = targetFromQuery ? [{ ...lookup(first), score: 1 }] : matchSymbols(q)
  const remote = (ctx.remote || []).filter((r) => !local.some((l) => l.symbol === r.symbol))
  const all = [...local, ...remote.map((r) => ({ ...r, score: 0.5 }))]
  const stocks = all.filter((s) => s.type === 'stock' || !s.type).slice(0, 7)
  const funds = all.filter((s) => s.type === 'etf' || s.type === 'index').slice(0, 5)
  const toItem = (s) => ({ id: 'sym:' + s.symbol, kind: 'stock', symbol: s.symbol, title: s.symbol, subtitle: s.name, exchange: s.exchange, type: s.type, sector: s.sector, to: `/stock/${encodeURIComponent(s.symbol)}` })
  push('stocks', 'Stocks', stocks.map(toItem))
  push('funds', 'ETFs & Indexes', funds.map(toItem))

  // 4) Sectors & industries
  push('taxonomy', 'Sectors & Industries', matchTaxonomy(q).map((t) => ({ id: 't:' + t.name, kind: 'taxonomy', title: t.name, subtitle: `${t.count} stocks · open in screener`, to: `/screener?${t.kind}=${encodeURIComponent(t.name)}` })))

  // 5) News headlines
  const n = norm(q)
  const news = (ctx.news || []).map((a) => ({ a, s: score(n, a.title) })).filter((x) => x.s >= 0.6 || (n.length >= 4 && norm(x.a.title).includes(n))).slice(0, 4)
  push('news', 'News', news.map(({ a }) => ({ id: 'n:' + a.id, kind: 'news', title: a.title, subtitle: `${a.source || ''}${a.symbol ? ' · ' + a.symbol : ''}`, to: a.symbol ? `/stock/${a.symbol}#news` : '/#news', url: a.url })))

  return groups
}
