import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '../../hooks/useQuery'
import { getSnapshot, getFinancials, normalizeSymbol } from '../../data'
import { Card, CopyValue, Change, Logo, Skeleton, ErrorMessage, useHashHighlight, Badge } from '../../components/ui'
import { PriceChart } from './PriceChart'
import { HeroTiles } from './HeroTiles'
import { buildSummary } from './summary'
import { HealthSection, ValuationContext, SnapshotSections, FinancialCharts, EarningsHistory, AnalystRatings, InsiderActivity, SentimentSection, NewsSection, PeersRow, AboutSection, NotesSection } from './sections'
import { SECTIONS } from './snapshotFields'
import { useWatchlist } from '../watchlist/useWatchlist'
import { pushRecent } from '../search/recent'
import { ShareButton } from '../layout/ShareButton'
import { Star, Columns, Bell } from '../../components/Icons'
import { fmtMoney, fmtBigMoney, fmtBig, fmtTime } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

/** The stock page: header + summary, chart, hero tiles, health, valuation, every Finviz field, and the long tail. */
export function StockPage() {
  const { symbol: raw } = useParams()
  const symbol = normalizeSymbol(decodeURIComponent(raw || ''))
  const { data: snap, loading, error, refetch } = useQuery('snap:' + symbol, () => getSnapshot(symbol))
  const annual = useQuery('annual:' + symbol, () => getFinancials(symbol, 'annual'), { enabled: !!snap && snap.type === 'stock' })
  const [periodPerf, setPeriodPerf] = useState(null)
  const onRange = useCallback((range, perf) => setPeriodPerf({ range, perf }), [])
  useEffect(() => { if (snap) { document.title = `${snap.symbol} · ${snap.name} · Bluechip`; pushRecent(snap.symbol, snap.name) } return () => { document.title = 'Bluechip' } }, [snap])
  useHashHighlight([loading])

  if (error) return (
    <div className="mx-auto max-w-2xl pt-10">
      <ErrorMessage error={error} onRetry={refetch}><Link to="/" className="btn btn-primary">Back to home</Link></ErrorMessage>
    </div>
  )
  const isStock = !snap || snap.type === 'stock'
  return (
    <div className="space-y-12">
      <StockHeader snap={snap} loading={loading} />
      <section id="chart" className="space-y-4">
        <Card className="p-3 sm:p-5">
          <PriceChart symbol={symbol} onRangeChange={onRange} />
        </Card>
      </section>
      {isStock && <HeroTiles snapshot={snap} annual={annual.data} />}
      {snap && <SectionNav />}
      {snap && isStock && <HealthSection snapshot={snap} />}
      {snap && isStock && <ValuationContext snapshot={snap} />}
      {snap && <SnapshotSections snapshot={snap} />}
      {snap && isStock && <FinancialCharts symbol={symbol} />}
      {snap && isStock && <EarningsHistory symbol={symbol} />}
      {snap && isStock && <AnalystRatings symbol={symbol} price={snap.quote.price} />}
      {snap && isStock && <InsiderActivity symbol={symbol} metrics={snap.metrics} />}
      {snap && <SentimentSection symbol={symbol} />}
      {snap && <NewsSection symbol={symbol} />}
      {snap && isStock && <PeersRow symbol={symbol} />}
      {snap && <AboutSection snapshot={snap} />}
      {snap && <NotesSection symbol={symbol} />}
    </div>
  )
}

function StockHeader({ snap, loading }) {
  const { has, toggle, addAlert } = useWatchlist()
  const toast = useToast()
  if (loading || !snap) return (
    <div className="space-y-4">
      <div className="flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-2xl" /><div><Skeleton className="h-8 w-64" /><Skeleton className="mt-2 h-5 w-40" /></div></div>
      <Skeleton className="h-14 w-56" /><Skeleton className="h-20 w-full" />
    </div>
  )
  const q = snap.quote, s = buildSummary(snap)
  const watched = has(snap.symbol)
  const setAlert = () => {
    const v = window.prompt(`Alert me when ${snap.symbol} crosses… (current ${fmtMoney(q.price)})`, q.price?.toFixed(2))
    if (v == null) return
    const price = Number(v)
    if (!Number.isFinite(price) || price <= 0) { toast('Please enter a valid price', { tone: 'error' }); return }
    addAlert(snap.symbol, price >= q.price ? 'above' : 'below', price)
    toast(`Alert set: ${snap.symbol} ${price >= q.price ? 'above' : 'below'} ${fmtMoney(price)}`, { tone: 'success' })
  }
  return (
    <header className="fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Logo symbol={snap.symbol} src={snap.logo} size={64} />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{snap.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-muted">
              <span className="text-lg font-bold text-text">{snap.symbol}</span><span>·</span><span>{snap.exchange}</span>
              {snap.sector && <><span>·</span><Link to={`/screener?sector=${encodeURIComponent(snap.sector)}`} className="link font-medium">{snap.sector}</Link></>}
              {snap.industry && <><span>·</span><Link to={`/screener?industry=${encodeURIComponent(snap.industry)}`} className="link font-medium">{snap.industry}</Link></>}
              {snap.source && snap.source !== 'demo' ? null : <Badge tone="accent">Demo data</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { toggle(snap.symbol); toast(watched ? `Removed ${snap.symbol} from watchlist` : `Added ${snap.symbol} to watchlist`, { tone: 'success' }) }} className={`btn ${watched ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={watched}><Star size={20} filled={watched} />{watched ? 'Watching' : 'Watch'}</button>
          <button type="button" onClick={setAlert} className="btn btn-secondary"><Bell size={20} />Alert</button>
          <Link to={`/compare?s=${snap.symbol}`} className="btn btn-secondary"><Columns size={20} />Compare</Link>
          <ShareButton />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2">
        <CopyValue value={q.price} display={fmtMoney(q.price)} className="text-5xl font-extrabold tracking-tight sm:text-6xl" />
        <div className="flex flex-col pb-1">
          <Change value={q.changePct} size="text-2xl" />
          <span className="num text-text-2">{q.change >= 0 ? '+' : '-'}{fmtMoney(Math.abs(q.change))} today</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 pb-1 text-sm text-muted sm:ml-auto">
          {q.marketCap && <span>Mkt cap <b className="num text-text">{fmtBigMoney(q.marketCap)}</b></span>}
          {q.volume && <span>Volume <b className="num text-text">{fmtBig(q.volume, 1)}</b></span>}
          {q.dayLow && <span>Day range <b className="num text-text">{fmtMoney(q.dayLow)} – {fmtMoney(q.dayHigh)}</b></span>}
          {q.timestamp ? <span>As of {fmtTime(q.timestamp)}</span> : null}
        </div>
      </div>
      {s && (
        <Card className="mt-6 border-l-4 border-l-accent">
          <div className="label mb-2">In plain English</div>
          <p className="text-lg leading-relaxed"><b>What it does.</b> {s.what}</p>
          <p className="mt-2 text-lg leading-relaxed"><b>How it makes money.</b> {s.money}</p>
          <p className="mt-2 text-lg leading-relaxed"><b>Are the numbers improving?</b> <span className={s.improving === true ? 'text-up' : s.improving === false ? 'text-down' : ''}>{s.trend}</span></p>
        </Card>
      )}
    </header>
  )
}

/** Sticky-ish jump bar to every section. */
function SectionNav() {
  return (
    <nav aria-label="Sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2 pb-1">
        {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="chip whitespace-nowrap">{s.label}</a>)}
      </div>
    </nav>
  )
}
