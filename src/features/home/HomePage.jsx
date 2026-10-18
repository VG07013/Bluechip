import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchBox } from '../search/SearchBox'
import { useQuery } from '../../hooks/useQuery'
import { getIndexQuotes, getTrending, getNews, getGainers, getLosers, getQuotes, getEarningsCalendar, getEconomicCalendar, getSentiment } from '../../data'
import { Card, SectionHeader, Skeleton, Change, Logo, EmptyState, ErrorMessage, Badge, TickerLink } from '../../components/ui'
import { Sparkline } from '../../components/Sparkline'
import { fmtMoney, fmtBig, timeAgo, toISODate, fmtShortDate, fmtNumber, isNum } from '../../lib/format'
import { useWatchlist } from '../watchlist/useWatchlist'
import { recentStore, lastVisitStore } from '../search/recent'
import { Clock, Calendar, Trend, ArrowRight } from '../../components/Icons'
import { lookup } from '../../data'

export function HomePage() {
  return (
    <div className="space-y-12">
      <section className="relative z-20 pt-6 text-center sm:pt-12 fade-in">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Research any stock. <span className="text-accent">No noise.</span></h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">Every Finviz metric, big and readable. Type a ticker, a company, a metric like “ROE”, or a command like “compare AAPL MSFT”.</p>
        <div className="mt-8"><SearchBox variant="hero" /></div>
      </section>
      <MarketStrip />
      <SinceLastVisit />
      <Trending />
      <div className="grid gap-8 lg:grid-cols-2">
        <Movers kind="gainers" />
        <Movers kind="losers" />
      </div>
      <NewsFeed />
      <WeekAhead />
    </div>
  )
}

/* ---------------------------------------------------------- market strip */

function moodFrom(indexes) {
  const by = Object.fromEntries(indexes.map((i) => [i.short, i]))
  const avg = ['S&P 500', 'Nasdaq', 'Dow'].map((k) => by[k]?.changePct).filter(isNum)
  if (!avg.length) return null
  const mean = avg.reduce((a, b) => a + b, 0) / avg.length
  const vix = by['VIX']?.price ?? 18
  const score = Math.round(Math.max(0, Math.min(100, 50 + mean * 14 - (vix - 18) * 1.6)))
  const label = score < 25 ? 'Fearful' : score < 45 ? 'Cautious' : score < 55 ? 'Neutral' : score < 75 ? 'Optimistic' : 'Greedy'
  return { score, label }
}

function MarketStrip() {
  const { data, loading, error } = useQuery('indexes', () => getIndexQuotes())
  const mood = data ? moodFrom(data) : null
  return (
    <section aria-label="Market overview">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 stagger">
        {loading && Array.from({ length: 6 }).map((_, i) => <Card key={i}><Skeleton className="h-4 w-20" /><Skeleton className="mt-3 h-8 w-28" /><Skeleton className="mt-2 h-4 w-16" /></Card>)}
        {error && <div className="sm:col-span-3 lg:col-span-6"><ErrorMessage error={error} title="Market data unavailable" /></div>}
        {data?.map((ix) => (
          <Link key={ix.symbol} to={`/stock/${encodeURIComponent(ix.symbol)}`} className="card card-hover block p-5">
            <div className="label">{ix.short}</div>
            <div className="num mt-1 text-2xl font-bold sm:text-3xl">{fmtNumber(ix.price, 2)}</div>
            <Change value={ix.changePct} className="mt-1" />
          </Link>
        ))}
        {mood && (
          <Card className="flex flex-col justify-between">
            <div className="label">Market mood</div>
            <div className="mt-1 text-2xl font-bold sm:text-3xl">{mood.label}</div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full transition-all" style={{ width: `${mood.score}%`, background: mood.score >= 50 ? 'var(--up)' : 'var(--down)' }} /></div>
            <div className="mt-1 text-sm text-muted">{mood.score}/100 · from index moves & VIX</div>
          </Card>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- trending */

function Trending() {
  const { data, loading, error } = useQuery('trending', () => getTrending(10))
  return (
    <section id="trending">
      <SectionHeader title="Trending" subtitle="Most-discussed tickers on StockTwits right now" />
      {error && <ErrorMessage error={error} title="Trending unavailable" />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 stagger">
        {loading && Array.from({ length: 10 }).map((_, i) => <Card key={i}><Skeleton className="h-11 w-11 rounded-2xl" /><Skeleton className="mt-3 h-6 w-20" /><Skeleton className="mt-2 h-8 w-28" /><Skeleton className="mt-3 h-9 w-full" /></Card>)}
        {data?.map((t, i) => (
          <Link key={t.symbol} to={`/stock/${encodeURIComponent(t.symbol)}`} className="card card-hover block p-5">
            <div className="flex items-center justify-between">
              <Logo symbol={t.symbol} size={44} />
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-sm font-bold text-muted">#{i + 1}</span>
            </div>
            <div className="mt-3 text-xl font-bold">{t.symbol}</div>
            <div className="truncate text-sm text-muted">{t.name}</div>
            <div className="num mt-2 text-2xl font-bold">{t.price != null ? fmtMoney(t.price) : '—'}</div>
            <Change value={t.changePct} />
            <div className="mt-3"><Sparkline data={t.sparkline} width={200} height={40} className="w-full" /></div>
            <div className="mt-2 text-sm text-muted">{t.messageVolume != null ? `${fmtBig(t.messageVolume, 1)} messages` : t.watchers != null ? `${fmtBig(t.watchers, 1)} watchers` : 'Trending'}</div>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- gainers/losers */

function Movers({ kind }) {
  const { data, loading, error } = useQuery('movers:' + kind, () => (kind === 'gainers' ? getGainers() : getLosers()))
  return (
    <section id={kind}>
      <SectionHeader title={kind === 'gainers' ? 'Top gainers' : 'Top losers'} subtitle="Today’s biggest moves" />
      <Card className="p-2 sm:p-3">
        {loading && <div className="space-y-2 p-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>}
        {error && <ErrorMessage error={error} />}
        <ul className="divide-y divide-border stagger">
          {data?.slice(0, 8).map((m) => (
            <li key={m.symbol}>
              <Link to={`/stock/${encodeURIComponent(m.symbol)}`} className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-2">
                <Logo symbol={m.symbol} size={40} />
                <div className="min-w-0 flex-1"><div className="text-lg font-bold">{m.symbol}</div><div className="truncate text-sm text-muted">{m.name}</div></div>
                <div className="text-right"><div className="num text-lg font-bold">{fmtMoney(m.price)}</div><Change value={m.changePct} /></div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}

/* ------------------------------------------------------------------ news */

function NewsFeed() {
  const { data, loading, error } = useQuery('news:home', () => getNews(null, 12))
  const [labels, setLabels] = useState({})
  useEffect(() => {
    if (!data) return
    const syms = [...new Set(data.map((n) => n.symbol).filter(Boolean))].slice(0, 12)
    syms.forEach((s) => getSentiment(s).then((r) => setLabels((l) => ({ ...l, [s]: r.bullish == null ? null : r.bullish >= 50 ? 'Bullish' : 'Bearish' }))).catch(() => {}))
  }, [data])
  return (
    <section id="news">
      <SectionHeader title="News" subtitle="Latest headlines with StockTwits sentiment for each ticker" />
      {error && <ErrorMessage error={error} title="News unavailable" />}
      <div className="grid gap-4 md:grid-cols-2 stagger">
        {loading && Array.from({ length: 6 }).map((_, i) => <Card key={i}><Skeleton className="h-5 w-24" /><Skeleton className="mt-3 h-6" /><Skeleton className="mt-2 h-6 w-3/4" /></Card>)}
        {data?.map((n) => <NewsCard key={n.id} n={n} label={labels[n.symbol] ?? n.sentiment} />)}
      </div>
    </section>
  )
}

export function NewsCard({ n, label }) {
  const external = n.url && n.url !== '#'
  const Wrap = external ? 'a' : 'div'
  const props = external ? { href: n.url, target: '_blank', rel: 'noopener noreferrer' } : {}
  return (
    <Wrap {...props} className="card card-hover block p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        {n.symbol && <TickerLink symbol={n.symbol} className="rounded-md bg-accent-soft px-2 py-0.5 text-sm" />}
        {label && <Badge tone={label === 'Bullish' ? 'up' : 'down'}>{label}</Badge>}
        <span>{n.source}</span><span>·</span><span>{timeAgo(n.publishedAt)}</span>
      </div>
      <h3 className="text-lg font-bold leading-snug">{n.title}</h3>
      {n.summary && <p className="mt-2 line-clamp-2 text-muted">{n.summary}</p>}
    </Wrap>
  )
}

/* ------------------------------------------------------ since last visit */

function SinceLastVisit() {
  const { symbols: wl } = useWatchlist()
  const recent = recentStore.use()
  const symbols = useMemo(() => [...new Set([...wl, ...recent.map((r) => r.symbol)])].slice(0, 12), [wl, recent])
  const [prev] = useState(() => lastVisitStore.get())
  const { data } = useQuery('since:' + symbols.join(','), () => getQuotes(symbols), { enabled: symbols.length > 0 })
  useEffect(() => {
    if (!data) return
    const prices = { ...(prev?.prices || {}), ...Object.fromEntries(data.map((q) => [q.symbol, q.price])) }
    lastVisitStore.set({ at: Date.now(), prices })
  }, [data, prev])
  if (!symbols.length) return null
  const rows = (data || []).map((q) => ({ ...q, since: prev?.prices?.[q.symbol] != null ? ((q.price - prev.prices[q.symbol]) / prev.prices[q.symbol]) * 100 : null }))
  return (
    <section>
      <SectionHeader title="Since your last visit" subtitle={prev?.at ? `Changes for your watchlist and recent stocks since ${timeAgo(prev.at)}` : 'Your watchlist and recent stocks — come back later to see what changed'} />
      <div className="flex gap-3 overflow-x-auto pb-2 stagger">
        {!data && symbols.map((s) => <Skeleton key={s} className="h-24 w-44 shrink-0" />)}
        {rows.map((q) => (
          <Link key={q.symbol} to={`/stock/${encodeURIComponent(q.symbol)}`} className="card card-hover w-44 shrink-0 p-4">
            <div className="flex items-center gap-2"><Logo symbol={q.symbol} size={28} /><span className="font-bold">{q.symbol}</span></div>
            <div className="num mt-2 text-xl font-bold">{fmtMoney(q.price)}</div>
            <div className="flex items-center gap-2 text-sm"><Change value={q.since ?? q.changePct} /><span className="text-muted">{q.since != null ? 'since visit' : 'today'}</span></div>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ week ahead */

function weekRange() {
  const now = new Date(); const day = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7)); mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { from: toISODate(mon), to: toISODate(sun) }
}

function WeekAhead() {
  const { from, to } = weekRange()
  const { symbols: wl } = useWatchlist()
  const recent = recentStore.use()
  const mine = useMemo(() => new Set([...wl, ...recent.map((r) => r.symbol)]), [wl, recent])
  const earn = useQuery('earn:' + from, () => getEarningsCalendar(from, to))
  const econ = useQuery('econ:' + from, () => getEconomicCalendar(from, to))
  const earnRows = useMemo(() => {
    const all = earn.data || []
    const prioritized = all.filter((e) => mine.has(e.symbol))
    const rest = all.filter((e) => !mine.has(e.symbol) && lookup(e.symbol))
    return [...prioritized, ...rest].slice(0, 10)
  }, [earn.data, mine])
  const econRows = useMemo(() => (econ.data || []).filter((e) => e.impact !== 'low').slice(0, 8), [econ.data])
  return (
    <section>
      <SectionHeader title="This week" subtitle={`${fmtShortDate(from)} – ${fmtShortDate(to)} · earnings and economic events`} action={<Link to="/calendar" className="btn btn-secondary">Full calendars <ArrowRight size={18} /></Link>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2 text-lg font-bold"><Trend size={22} className="text-accent" /> Earnings</div>
          {earn.loading && <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
          {earn.error && <p className="text-muted">Earnings calendar unavailable right now.</p>}
          {earn.data && !earnRows.length && <p className="text-muted">No earnings from your lists this week.</p>}
          <ul className="divide-y divide-border">
            {earnRows.map((e) => (
              <li key={e.symbol + e.date} className="flex items-center gap-3 py-3">
                <div className="w-16 text-sm font-bold text-muted">{fmtShortDate(e.date)}</div>
                <TickerLink symbol={e.symbol} className="text-lg" />
                <div className="min-w-0 flex-1 truncate text-muted">{e.name}</div>
                {mine.has(e.symbol) && <Badge tone="accent">Yours</Badge>}
                <div className="text-sm font-semibold text-muted">{String(e.time).toUpperCase() === 'BMO' ? 'Before open' : String(e.time).toUpperCase() === 'AMC' ? 'After close' : ''}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="mb-3 flex items-center gap-2 text-lg font-bold"><Calendar size={22} className="text-accent" /> Economic events</div>
          {econ.loading && <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
          {econ.error && <p className="text-muted">Economic calendar unavailable right now.</p>}
          {econ.data && !econRows.length && <p className="text-muted">No major events scheduled this week.</p>}
          <ul className="divide-y divide-border">
            {econRows.map((e, i) => (
              <li key={e.event + e.date + i} className="flex items-center gap-3 py-3">
                <div className="w-16 text-sm font-bold text-muted">{fmtShortDate(e.date)}</div>
                <div className="min-w-0 flex-1"><div className="font-semibold">{e.event}</div><div className="text-sm text-muted">{e.time ? e.time + ' · ' : ''}Est. {e.estimate ?? '—'} · Prev. {e.previous ?? '—'}</div></div>
                <Badge tone={e.impact === 'high' ? 'accent' : 'neutral'}>{e.impact === 'high' ? 'High impact' : 'Medium'}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  )
}
