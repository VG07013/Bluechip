/**
 * Stock page sections: health score, valuation context, snapshot groups, financial charts,
 * earnings history, analyst ratings, insider activity, sentiment, news, peers, about, notes.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '../../hooks/useQuery'
import { getFinancials, getEarningsHistory, getAnalyst, getInsiderTrades, getSentiment, getNews, getPeers, getPeHistory, getSectorPe, getQuotes } from '../../data'
import { Card, SectionHeader, CopyValue, Skeleton, Change, Gauge, Badge, DataTable, Segmented, Logo, TickerLink, ErrorMessage } from '../../components/ui'
import { BarChart } from '../../components/BarChart'
import { Sparkline } from '../../components/Sparkline'
import { GROUPS, fieldsInGroup } from './snapshotFields'
import { healthScore, healthLabel } from './health'
import { fmtByKind, fmtMoney, fmtPct, fmtBigMoney, fmtBig, fmtDate, fmtShortDate, timeAgo, isNum } from '../../lib/format'
import { NewsCard } from '../home/HomePage'
import { notesStore } from '../search/recent'
import { Info } from '../../components/Icons'

/* ------------------------------------------------------------ health */
export function HealthSection({ snapshot }) {
  const s = healthScore(snapshot.metrics)
  return (
    <section id="health">
      <SectionHeader title="Health score" subtitle="An automated summary of growth, profitability and balance-sheet strength. Not investment advice." />
      <Card className="flex flex-col items-center gap-6 lg:flex-row lg:justify-around">
        <div className="text-center">
          <div className="label">Overall</div>
          <div className="num text-6xl font-extrabold tracking-tight sm:text-7xl" style={{ color: s.overall == null ? 'var(--muted)' : s.overall >= 55 ? 'var(--up)' : s.overall >= 35 ? 'var(--text)' : 'var(--down)' }}>{s.overall ?? '—'}</div>
          <div className="text-lg font-bold text-muted">{healthLabel(s.overall)} · out of 100</div>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <Gauge value={s.growth} label="Growth" caption={healthLabel(s.growth)} />
          <Gauge value={s.profitability} label="Profitability" caption={healthLabel(s.profitability)} />
          <Gauge value={s.balance} label="Balance sheet" caption={healthLabel(s.balance)} />
        </div>
      </Card>
    </section>
  )
}

/* --------------------------------------------------------- valuation ctx */
export function ValuationContext({ snapshot }) {
  const pe = snapshot.metrics.pe
  const hist = useQuery('pehist:' + snapshot.symbol, () => getPeHistory(snapshot.symbol))
  const sector = useQuery('sectorpe:' + snapshot.sector, () => getSectorPe(snapshot.sector))
  const range = useMemo(() => {
    const vals = (hist.data || []).map((h) => h.pe).filter((v) => isNum(v) && v > 0 && v < 400)
    if (isNum(pe) && pe > 0) vals.push(pe)
    if (!vals.length) return null
    return { lo: Math.min(...vals), hi: Math.max(...vals) }
  }, [hist.data, pe])
  const pos = (v) => (range && range.hi > range.lo ? ((v - range.lo) / (range.hi - range.lo)) * 100 : 50)
  const sp = sector.data
  const verdict = isNum(pe) && isNum(sp) ? (pe < sp * 0.85 ? 'below' : pe > sp * 1.15 ? 'above' : 'in line with') : null
  return (
    <section id="valuation-context">
      <SectionHeader title="Valuation context" subtitle="Where today’s P/E sits against the stock’s own 5-year range and its sector" />
      <Card>
        {!isNum(pe) || pe <= 0 ? (
          <p className="text-muted">P/E is not meaningful right now (no positive trailing earnings), so there is no range to compare against.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-6">
              <div><div className="label">Current P/E</div><CopyValue value={pe} display={pe.toFixed(1)} className="text-5xl font-extrabold tracking-tight" /></div>
              <div><div className="label">5-year range</div><div className="num text-2xl font-bold">{range ? `${range.lo.toFixed(1)} – ${range.hi.toFixed(1)}` : <Skeleton className="h-7 w-32" />}</div></div>
              <div><div className="label">{snapshot.sector || 'Sector'} average</div><div className="num text-2xl font-bold">{isNum(sp) ? sp.toFixed(1) : <Skeleton className="h-7 w-16" />}</div></div>
            </div>
            {range && (
              <div className="relative mt-8 h-4 rounded-full bg-surface-3">
                <div className="absolute inset-y-0 rounded-full bg-accent-soft" style={{ left: 0, right: 0 }} />
                {isNum(sp) && sp >= range.lo && sp <= range.hi && <div className="absolute -top-7 -translate-x-1/2 text-sm font-bold text-muted" style={{ left: `${pos(sp)}%` }}>Sector {sp.toFixed(0)}<div className="mx-auto h-3 w-0.5 bg-muted" /></div>}
                <div className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-surface bg-accent shadow-card" style={{ left: `${pos(pe)}%` }} aria-label="Current P/E" />
                <div className="absolute -bottom-7 left-0 text-sm text-muted">Low {range.lo.toFixed(0)}</div>
                <div className="absolute -bottom-7 right-0 text-sm text-muted">High {range.hi.toFixed(0)}</div>
              </div>
            )}
            <p className="mt-10 text-text-2">
              {range && (pe <= range.lo + (range.hi - range.lo) * 0.25 ? 'The stock trades near the cheap end of its own 5-year range.' : pe >= range.lo + (range.hi - range.lo) * 0.75 ? 'The stock trades near the expensive end of its own 5-year range.' : 'The stock trades in the middle of its own 5-year range.')}
              {verdict && ` Its P/E is ${verdict} the ${(snapshot.sector || 'sector').toLowerCase()} sector average.`}
            </p>
            {hist.data?.length > 1 && <div className="mt-4 flex items-center gap-3 text-sm text-muted"><Sparkline data={hist.data.map((h) => h.pe)} width={140} height={34} color="var(--accent)" />Annual P/E, {hist.data[0].year}–{hist.data.at(-1).year}</div>}
          </>
        )}
      </Card>
    </section>
  )
}

/* ---------------------------------------------------------- snapshot */
export function SnapshotSections({ snapshot }) {
  const m = snapshot.metrics
  return (
    <div className="space-y-8">
      {GROUPS.map((g) => (
        <section key={g.id} id={g.id}>
          <SectionHeader title={g.label} />
          <Card className="p-2 sm:p-3">
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
              {fieldsInGroup(g.id).map((f) => {
                const v = m[f.key]
                const signed = f.kind === 'pctSigned'
                const color = signed && isNum(v) ? (v > 0 ? 'text-up' : v < 0 ? 'text-down' : '') : f.key === 'rsi' && isNum(v) ? (v >= 70 ? 'text-down' : v <= 30 ? 'text-up' : '') : ''
                return (
                  <div key={f.key} data-metric={f.key} className="flex items-center justify-between gap-3 rounded-xl border-b border-border px-3 py-3 last:border-0 sm:[&:nth-last-child(-n+2)]:border-0 xl:[&:nth-last-child(-n+3)]:border-0">
                    <dt className="text-text-2">{f.label}</dt>
                    <dd className="text-right">
                      {v == null || v === '' ? <span className="text-muted" title="Not available from the current data provider">n/a</span> : <CopyValue value={v} display={fmtByKind(v, f.kind)} className={`text-lg font-bold ${color}`} />}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </Card>
        </section>
      ))}
    </div>
  )
}

/* ---------------------------------------------------- financial charts */
export function FinancialCharts({ symbol }) {
  const [period, setPeriod] = useState('annual')
  const { data, loading, error } = useQuery(`fin:${symbol}:${period}`, () => getFinancials(symbol, period))
  const rows = useMemo(() => (data || []).map((r) => ({
    label: period === 'annual' ? `FY${String(r.fiscalYear).slice(-2)}` : `${r.period} ${String(r.fiscalYear).slice(-2)}`,
    revenue: r.revenue, netIncome: r.netIncome, grossMargin: r.revenue ? (r.grossProfit / r.revenue) * 100 : null, operMargin: r.revenue ? (r.operatingIncome / r.revenue) * 100 : null,
    profitMargin: r.revenue ? (r.netIncome / r.revenue) * 100 : null, eps: r.eps, debt: r.totalDebt, cash: r.cash, ocf: r.operatingCashFlow, fcf: r.freeCashFlow,
  })), [data, period])
  const charts = [
    { title: 'Revenue & net income', series: [{ key: 'revenue', label: 'Revenue' }, { key: 'netIncome', label: 'Net income' }], kind: 'bigmoney' },
    { title: 'Margins', series: [{ key: 'grossMargin', label: 'Gross', type: 'line' }, { key: 'operMargin', label: 'Operating', type: 'line', color: 'var(--accent)' }, { key: 'profitMargin', label: 'Net', type: 'line', color: 'var(--muted)' }], kind: 'pct' },
    { title: 'Earnings per share', series: [{ key: 'eps', label: 'EPS' }], kind: 'money' },
    { title: 'Debt & cash', series: [{ key: 'debt', label: 'Total debt', color: 'var(--muted)' }, { key: 'cash', label: 'Cash' }], kind: 'bigmoney' },
    { title: 'Cash flow', series: [{ key: 'ocf', label: 'Operating cash flow' }, { key: 'fcf', label: 'Free cash flow', color: 'var(--accent-hover)' }], kind: 'bigmoney' },
  ]
  return (
    <section id="financials">
      <SectionHeader title="Financial charts" subtitle="Revenue, income, margins, EPS, debt and cash flow over time" action={<Segmented options={[{ value: 'annual', label: 'Annual' }, { value: 'quarter', label: 'Quarterly' }]} value={period} onChange={setPeriod} ariaLabel="Period" />} />
      {error && <ErrorMessage error={error} title="Financials unavailable" />}
      <div className="grid gap-4 lg:grid-cols-2 stagger">
        {loading && [1, 2, 3, 4].map((i) => <Card key={i}><Skeleton className="h-5 w-40" /><Skeleton className="mt-4 h-56" /></Card>)}
        {!loading && !error && charts.map((c) => <Card key={c.title}><h3 className="mb-3 text-lg font-bold">{c.title}</h3><BarChart data={rows} series={c.series} kind={c.kind} /></Card>)}
      </div>
    </section>
  )
}

/* --------------------------------------------------------- earnings */
export function EarningsHistory({ symbol }) {
  const { data, loading, error } = useQuery('earn:' + symbol, () => getEarningsHistory(symbol))
  const rows = (data || []).slice(0, 8)
  const beats = rows.filter((r) => isNum(r.surprisePct) && r.surprisePct >= 0).length
  return (
    <section id="earnings">
      <SectionHeader title="Earnings history" subtitle={rows.length ? `${beats} beats, ${rows.length - beats} misses in the last ${rows.length} reports` : 'Beats and misses versus analyst estimates'} />
      {loading && <Card><Skeleton className="h-40" /></Card>}
      {error && <ErrorMessage error={error} title="Earnings history unavailable" />}
      {data && (
        <Card className="p-2 sm:p-3">
          <DataTable rows={rows} rowKey="date" filename={`${symbol}-earnings`} columns={[
            { key: 'date', label: 'Report date', render: (r) => <span className="font-semibold">{fmtDate(r.date)}</span> },
            { key: 'period', label: 'Period' },
            { key: 'epsEstimate', label: 'EPS est.', kind: 'money', align: 'right' },
            { key: 'epsActual', label: 'EPS actual', kind: 'money', align: 'right' },
            { key: 'surprisePct', label: 'Surprise', align: 'right', render: (r) => isNum(r.surprisePct) ? <Badge tone={r.surprisePct >= 0 ? 'up' : 'down'}>{r.surprisePct >= 0 ? 'Beat' : 'Miss'} {fmtPct(r.surprisePct, 1, { sign: true })}</Badge> : '—' },
            { key: 'revenueEstimate', label: 'Revenue est.', kind: 'bigmoney', align: 'right' },
            { key: 'revenueActual', label: 'Revenue actual', kind: 'bigmoney', align: 'right' },
          ]} />
        </Card>
      )}
    </section>
  )
}

/* ---------------------------------------------------------- analysts */
export function AnalystRatings({ symbol, price }) {
  const { data, loading, error } = useQuery('analyst:' + symbol, () => getAnalyst(symbol))
  if (loading) return <section id="ratings"><SectionHeader title="Analyst ratings" /><Card><Skeleton className="h-40" /></Card></section>
  if (error) return <section id="ratings"><SectionHeader title="Analyst ratings" /><ErrorMessage error={error} title="Ratings unavailable" /></section>
  if (!data) return <section id="ratings"><SectionHeader title="Analyst ratings" /><Card><p className="text-muted">No analyst coverage data for this ticker.</p></Card></section>
  const c = data.counts, total = data.total || 1
  const bars = [['Strong buy', c.strongBuy, 'var(--up)'], ['Buy', c.buy, 'color-mix(in srgb, var(--up) 60%, var(--surface))'], ['Hold', c.hold, 'var(--border-strong)'], ['Sell', c.sell, 'color-mix(in srgb, var(--down) 60%, var(--surface))'], ['Strong sell', c.strongSell, 'var(--down)']]
  const t = data.target
  const upside = t?.mean && price ? ((t.mean - price) / price) * 100 : null
  return (
    <section id="ratings">
      <SectionHeader title="Analyst ratings" subtitle={`${data.total || 0} analysts · consensus ${data.consensus}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-baseline gap-3"><div className="text-4xl font-extrabold">{data.consensus}</div>{isNum(data.score) && <div className="text-muted">score {data.score.toFixed(2)} (1 = strong buy, 5 = sell)</div>}</div>
          <div className="mt-4 flex h-5 w-full overflow-hidden rounded-full bg-surface-3">{bars.map(([l, n, col]) => n > 0 && <div key={l} title={`${l}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: col }} />)}</div>
          <div className="mt-3 grid grid-cols-5 gap-2 text-center text-sm">{bars.map(([l, n]) => <div key={l}><div className="num text-xl font-bold">{n}</div><div className="text-muted">{l}</div></div>)}</div>
        </Card>
        <Card>
          <div className="label">Price target</div>
          {t ? (
            <>
              <div className="mt-1 flex items-baseline gap-3"><CopyValue value={t.mean} display={fmtMoney(t.mean)} className="text-4xl font-extrabold" />{isNum(upside) && <Change value={upside} />}<span className="text-muted">vs. {fmtMoney(price)}</span></div>
              <div className="relative mt-5 h-3 rounded-full bg-surface-3">
                <div className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-surface bg-accent" style={{ left: `${Math.max(0, Math.min(100, ((price - t.low) / (t.high - t.low || 1)) * 100))}%` }} title="Current price" />
              </div>
              <div className="mt-2 flex justify-between text-sm text-muted"><span>Low {fmtMoney(t.low)}</span><span>Median {fmtMoney(t.median)}</span><span>High {fmtMoney(t.high)}</span></div>
              {data.history?.length > 1 && <div className="mt-4 flex items-center gap-3 text-sm text-muted"><Sparkline data={data.history.map((h) => h.target)} width={160} height={36} color="var(--accent)" />Target history</div>}
            </>
          ) : <p className="text-muted">No price target data.</p>}
        </Card>
      </div>
      {data.actions?.length > 0 && (
        <Card className="mt-4 p-2 sm:p-3">
          <DataTable rows={data.actions} rowKey="date" filename={`${symbol}-ratings`} maxHeight={360} columns={[
            { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'firm', label: 'Firm' },
            { key: 'action', label: 'Action', render: (r) => <Badge tone={/up/i.test(r.action) ? 'up' : /down/i.test(r.action) ? 'down' : 'neutral'}>{r.action}</Badge> },
            { key: 'from', label: 'From' }, { key: 'to', label: 'To' }, { key: 'target', label: 'Target', kind: 'money', align: 'right' },
          ]} />
        </Card>
      )}
    </section>
  )
}

/* ---------------------------------------------------------- insiders */
export function InsiderActivity({ symbol, metrics }) {
  const { data, loading, error } = useQuery('insider:' + symbol, () => getInsiderTrades(symbol))
  const callout = useMemo(() => {
    if (!data) return null
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    const recent = data.filter((t) => new Date(t.date) >= cutoff)
    const buys = recent.filter((t) => t.type === 'Buy'), sales = recent.filter((t) => t.type === 'Sale')
    const people = (arr) => new Set(arr.map((t) => t.name)).size
    const parts = []
    if (buys.length) parts.push(`${people(buys)} insider${people(buys) > 1 ? 's' : ''} bought ${fmtBigMoney(buys.reduce((a, t) => a + t.value, 0), 1)} in the last 30 days`)
    if (sales.length) parts.push(`${people(sales)} insider${people(sales) > 1 ? 's' : ''} sold ${fmtBigMoney(sales.reduce((a, t) => a + t.value, 0), 1)}`)
    return { text: parts.length ? parts.join(' · ') : 'No insider transactions reported in the last 30 days', tone: buys.length && !sales.length ? 'up' : sales.length && !buys.length ? 'down' : 'neutral' }
  }, [data])
  return (
    <section id="insider">
      <SectionHeader title="Insider & institutional activity" subtitle="Recent transactions by executives, directors and large holders" />
      {callout && (
        <div className={`mb-4 flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${callout.tone === 'up' ? 'border-up/30 bg-up-soft' : callout.tone === 'down' ? 'border-down/30 bg-down-soft' : 'border-border bg-surface-2'}`}>
          <div className="text-lg font-bold">{callout.text}</div>
          <div className="ml-auto flex flex-wrap gap-4 text-sm text-text-2">
            <span>Insider own <b className="num">{fmtPct(metrics.insiderOwn)}</b></span><span>Inst. own <b className="num">{fmtPct(metrics.instOwn)}</b></span><span>Inst. trans <b className="num">{fmtPct(metrics.instTrans, 2, { sign: true })}</b></span>
          </div>
        </div>
      )}
      {loading && <Card><Skeleton className="h-40" /></Card>}
      {error && <ErrorMessage error={error} title="Insider data unavailable" />}
      {data && (
        <Card className="p-2 sm:p-3">
          <DataTable rows={data} rowKey={undefined} filename={`${symbol}-insiders`} maxHeight={420} emptyText="No insider trades reported." columns={[
            { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'name', label: 'Insider', render: (r) => <span className="font-semibold">{r.name}</span> }, { key: 'title', label: 'Title' },
            { key: 'type', label: 'Type', render: (r) => <Badge tone={r.type === 'Buy' ? 'up' : r.type === 'Sale' ? 'down' : 'neutral'}>{r.type}</Badge> },
            { key: 'shares', label: 'Shares', kind: 'int', align: 'right' }, { key: 'price', label: 'Price', kind: 'money', align: 'right' }, { key: 'value', label: 'Value', kind: 'bigmoney', align: 'right' },
          ]} />
        </Card>
      )}
    </section>
  )
}

/* --------------------------------------------------------- sentiment */
export function SentimentSection({ symbol }) {
  const { data, loading, error } = useQuery('sent:' + symbol, () => getSentiment(symbol))
  return (
    <section id="sentiment">
      <SectionHeader title="StockTwits sentiment" subtitle="Share of recent tagged messages that are bullish, plus the live feed" />
      {loading && <Card><Skeleton className="h-40" /></Card>}
      {error && <ErrorMessage error={error} title="Sentiment unavailable" />}
      {data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="flex flex-col items-center justify-center">
            <Gauge value={data.bullish} label={data.bullish == null ? 'No tagged messages' : data.bullish >= 50 ? 'Bullish' : 'Bearish'} size={220} caption={data.bullish != null ? `${data.bullish}% bullish · ${data.bearish}% bearish` : 'Sentiment unknown'} />
            <div className="mt-3 flex gap-4 text-sm text-muted">{data.messageVolume != null && <span>{fmtBig(data.messageVolume, 0)} messages</span>}{data.watchers != null && <span>{fmtBig(data.watchers, 1)} watchers</span>}</div>
            <div className="mt-2 text-xs text-muted">Source: {data.source === 'stocktwits' ? 'StockTwits' : data.source === 'fmp' ? 'FMP social sentiment' : 'demo'}</div>
          </Card>
          <Card className="lg:col-span-2 max-h-[28rem] overflow-y-auto p-2 sm:p-3">
            {data.messages?.length ? (
              <ul className="divide-y divide-border">{data.messages.map((m) => (
                <li key={m.id} className="flex gap-3 px-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">{(m.user || '?').slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-sm text-muted"><span className="font-bold text-text">@{m.user}</span>{m.sentiment && <Badge tone={m.sentiment === 'Bullish' ? 'up' : 'down'}>{m.sentiment}</Badge>}<span>{timeAgo(m.createdAt)}</span></div><p className="mt-1 break-words">{m.body}</p></div>
                </li>
              ))}</ul>
            ) : <p className="p-4 text-muted">Live message feed is unavailable from this source. Connect the StockTwits proxy (see README) to see messages.</p>}
          </Card>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------- news */
export function NewsSection({ symbol }) {
  const { data, loading, error } = useQuery('news:' + symbol, () => getNews(symbol, 10))
  const sent = useQuery('sentlabel:' + symbol, () => getSentiment(symbol))
  const label = sent.data?.bullish == null ? null : sent.data.bullish >= 50 ? 'Bullish' : 'Bearish'
  return (
    <section id="news">
      <SectionHeader title="News" subtitle={`Latest headlines about ${symbol}`} />
      {error && <ErrorMessage error={error} title="News unavailable" />}
      <div className="grid gap-4 md:grid-cols-2 stagger">
        {loading && [1, 2, 3, 4].map((i) => <Card key={i}><Skeleton className="h-5 w-24" /><Skeleton className="mt-3 h-6" /></Card>)}
        {data?.map((n) => <NewsCard key={n.id} n={n} label={label} />)}
        {data && !data.length && <p className="text-muted">No recent headlines.</p>}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ peers */
export function PeersRow({ symbol }) {
  const peers = useQuery('peers:' + symbol, () => getPeers(symbol))
  const quotes = useQuery('peerq:' + (peers.data || []).join(','), () => getQuotes(peers.data || []), { enabled: !!peers.data?.length })
  return (
    <section id="peers">
      <SectionHeader title="Peers" subtitle="Similar companies — click to open, or compare side by side" action={peers.data?.length ? <Link to={`/compare?s=${[symbol, ...peers.data.slice(0, 3)].join(',')}`} className="btn btn-secondary">Compare with peers</Link> : null} />
      <div className="flex gap-3 overflow-x-auto pb-2 stagger">
        {(peers.loading || (peers.data?.length && quotes.loading)) && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-44 shrink-0" />)}
        {quotes.data?.map((q) => (
          <Link key={q.symbol} to={`/stock/${encodeURIComponent(q.symbol)}`} className="card card-hover w-44 shrink-0 p-4">
            <div className="flex items-center gap-2"><Logo symbol={q.symbol} size={28} /><span className="font-bold">{q.symbol}</span></div>
            <div className="mt-1 truncate text-sm text-muted">{q.name}</div>
            <div className="num mt-2 text-xl font-bold">{fmtMoney(q.price)}</div><Change value={q.changePct} />
          </Link>
        ))}
        {peers.data && !peers.data.length && <p className="text-muted">No peer data available.</p>}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ about */
export function AboutSection({ snapshot }) {
  const [open, setOpen] = useState(false)
  const d = snapshot.description || 'No description available.'
  const long = d.length > 600
  return (
    <section id="about">
      <SectionHeader title={`About ${snapshot.name}`} />
      <Card>
        <p className={`leading-relaxed text-text-2 ${long && !open ? 'line-clamp-4' : ''}`}>{d}</p>
        {long && <button type="button" className="link mt-3" onClick={() => setOpen((o) => !o)}>{open ? 'Show less' : 'Read more'}</button>}
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {[['Sector', snapshot.sector], ['Industry', snapshot.industry], ['Country', snapshot.country], ['Exchange', snapshot.exchange], ['Employees', isNum(snapshot.employees) ? snapshot.employees.toLocaleString() : null], ['CEO', snapshot.ceo], ['Website', snapshot.website]].map(([k, v]) => v ? (
            <div key={k}><dt className="label">{k}</dt><dd className="mt-0.5 font-semibold">{k === 'Website' ? <a href={v} target="_blank" rel="noopener noreferrer" className="link break-all">{v.replace(/^https?:\/\//, '')}</a> : v}</dd></div>
          ) : null)}
        </dl>
      </Card>
    </section>
  )
}

/* ------------------------------------------------------------ notes */
export function NotesSection({ symbol }) {
  const notes = notesStore.use()
  const value = notes[symbol] || ''
  return (
    <section id="notes">
      <SectionHeader title="My notes" subtitle="Private to this browser. Saved automatically." />
      <Card>
        <textarea value={value} onChange={(e) => notesStore.set((n) => ({ ...n, [symbol]: e.target.value }))} rows={5} placeholder={`Why are you watching ${symbol}? Thesis, risks, price levels…`} className="input min-h-32 resize-y" aria-label={`Notes for ${symbol}`} />
        <div className="mt-2 flex items-center gap-2 text-sm text-muted"><Info size={16} />{value ? `${value.length} characters saved` : 'Nothing saved yet'}</div>
      </Card>
    </section>
  )
}
