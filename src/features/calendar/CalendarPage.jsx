import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getEarningsCalendar, getEconomicCalendar } from '../../data'
import { useQuery } from '../../hooks/useQuery'
import { useWatchlist } from '../watchlist/useWatchlist'
import { Card, SectionHeader, Segmented, Skeleton, Badge, TickerLink, ErrorMessage, EmptyState } from '../../components/ui'
import { fmtDate, fmtShortDate, toISODate, fmtMoney, fmtBigMoney } from '../../lib/format'
import { downloadCSV } from '../../lib/csv'
import { ChevronLeft, ChevronRight, Calendar } from '../../components/Icons'
import { ShareButton } from '../layout/ShareButton'

function rangeFor(anchor, span) {
  const d = new Date(anchor)
  if (span === 'week') { const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); return { from: toISODate(mon), to: toISODate(sun), label: `${fmtShortDate(mon)} – ${fmtDate(sun)}` } }
  const first = new Date(d.getFullYear(), d.getMonth(), 1), last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { from: toISODate(first), to: toISODate(last), label: first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
}

/** Earnings + economic calendars for the week or month, filterable to the watchlist. */
export function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'economic' ? 'economic' : 'earnings'
  const span = params.get('span') === 'month' ? 'month' : 'week'
  const [anchor, setAnchor] = useState(() => new Date())
  const [onlyMine, setOnlyMine] = useState(false)
  const { symbols: wl } = useWatchlist()
  const r = useMemo(() => rangeFor(anchor, span), [anchor, span])
  const set = (patch) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => n.set(k, v)); setParams(n, { replace: true }) }
  const shift = (dir) => { const d = new Date(anchor); span === 'week' ? d.setDate(d.getDate() + 7 * dir) : d.setMonth(d.getMonth() + dir); setAnchor(d) }
  const earn = useQuery(`earncal:${r.from}:${r.to}`, () => getEarningsCalendar(r.from, r.to), { enabled: tab === 'earnings' })
  const econ = useQuery(`econcal:${r.from}:${r.to}`, () => getEconomicCalendar(r.from, r.to), { enabled: tab === 'economic' })
  const q = tab === 'earnings' ? earn : econ
  const rows = useMemo(() => {
    let d = q.data || []
    if (tab === 'earnings' && onlyMine) d = d.filter((e) => wl.includes(e.symbol))
    return d
  }, [q.data, tab, onlyMine, wl])
  const byDay = useMemo(() => rows.reduce((acc, e) => { (acc[e.date] ||= []).push(e); return acc }, {}), [rows])
  const today = toISODate(new Date())
  return (
    <div className="space-y-6">
      <SectionHeader title="Calendars" subtitle="Earnings reports and economic events" action={<ShareButton />} />
      <Card className="flex flex-wrap items-center gap-3">
        <Segmented options={[{ value: 'earnings', label: 'Earnings' }, { value: 'economic', label: 'Economic' }]} value={tab} onChange={(v) => set({ tab: v })} ariaLabel="Calendar" />
        <Segmented options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} value={span} onChange={(v) => set({ span: v })} ariaLabel="Span" />
        <div className="flex flex-wrap items-center gap-1"><button type="button" className="btn btn-ghost px-2" aria-label="Previous" onClick={() => shift(-1)}><ChevronLeft /></button><span className="min-w-36 text-center text-lg font-bold">{r.label}</span><button type="button" className="btn btn-ghost px-2" aria-label="Next" onClick={() => shift(1)}><ChevronRight /></button><button type="button" className="btn btn-ghost text-sm" onClick={() => setAnchor(new Date())}>Today</button></div>
        {tab === 'earnings' && <label className="ml-auto flex cursor-pointer items-center gap-2 font-semibold"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />Watchlist only{wl.length ? ` (${wl.length})` : ''}</label>}
        <button type="button" className="btn btn-secondary" disabled={!rows.length} onClick={() => downloadCSV(`bluechip-${tab}-${r.from}`, rows)}>Export CSV</button>
      </Card>
      {q.loading && <Card><div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div></Card>}
      {q.error && <ErrorMessage error={q.error} title="Calendar unavailable" />}
      {q.data && !rows.length && <EmptyState icon={Calendar} title="Nothing scheduled">{onlyMine ? 'None of your watchlist stocks report in this period.' : 'No events found for this period.'}</EmptyState>}
      <div className="space-y-4 stagger">
        {Object.entries(byDay).map(([date, events]) => (
          <Card key={date} className={date === today ? 'border-accent' : ''}>
            <div className="mb-3 flex items-center gap-3"><h3 className="text-xl font-bold">{fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>{date === today && <Badge tone="accent">Today</Badge>}<span className="text-muted">{events.length} {tab === 'earnings' ? 'reports' : 'events'}</span></div>
            <ul className="divide-y divide-border">
              {events.map((e, i) => tab === 'earnings' ? (
                <li key={e.symbol + i} className="flex flex-wrap items-center gap-3 py-3">
                  <TickerLink symbol={e.symbol} className="w-20 text-lg" />
                  <span className="min-w-0 flex-1 truncate text-text-2">{e.name}</span>
                  {wl.includes(e.symbol) && <Badge tone="accent">Watchlist</Badge>}
                  <span className="text-sm font-semibold text-muted">{String(e.time).toUpperCase() === 'BMO' ? 'Before open' : String(e.time).toUpperCase() === 'AMC' ? 'After close' : e.time || ''}</span>
                  <span className="num w-28 text-right text-sm">EPS est. <b>{fmtMoney(e.epsEstimate)}</b></span>
                  <span className="num hidden w-36 text-right text-sm sm:inline">Rev est. <b>{fmtBigMoney(e.revenueEstimate, 1)}</b></span>
                </li>
              ) : (
                <li key={e.event + i} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="w-20 text-sm font-bold text-muted">{e.time || ''}</span>
                  <span className="min-w-0 flex-1 font-semibold">{e.event}</span>
                  <Badge tone={e.impact === 'high' ? 'accent' : 'neutral'}>{e.impact} impact</Badge>
                  <span className="num text-sm text-text-2">Prev <b>{e.previous ?? '—'}</b> · Est <b>{e.estimate ?? '—'}</b>{e.actual != null && e.actual !== '' ? <> · Actual <b className="text-accent">{e.actual}</b></> : null}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
