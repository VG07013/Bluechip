import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWatchlist, checkAlerts } from './useWatchlist'
import { getQuotes, getHistory, normalizeSymbol } from '../../data'
import { useQuery } from '../../hooks/useQuery'
import { Card, SectionHeader, Change, Logo, Skeleton, EmptyState, Badge } from '../../components/ui'
import { Sparkline } from '../../components/Sparkline'
import { fmtMoney, fmtDate } from '../../lib/format'
import { useToast } from '../../hooks/useToast'
import { Bell, Trash, Plus, Star } from '../../components/Icons'
import { downloadCSV } from '../../lib/csv'

/** Watchlist with price alerts (above/below), sparklines and CSV export. */
export function WatchlistPage() {
  const { items, symbols, add, remove, addAlert, removeAlert, markTriggered } = useWatchlist()
  const toast = useToast()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [alertFor, setAlertFor] = useState(null)
  const [alertPrice, setAlertPrice] = useState('')
  const key = symbols.join(',')
  const { data: quotes, loading } = useQuery('wl:' + key, () => getQuotes(symbols), { enabled: symbols.length > 0 })
  const [sparks, setSparks] = useState({})
  useEffect(() => { symbols.forEach((s) => { if (!sparks[s]) getHistory(s).then((b) => setSparks((x) => ({ ...x, [s]: b.slice(-30).map((q) => q.close) }))).catch(() => {}) }) /* eslint-disable-line react-hooks/exhaustive-deps */ }, [key])
  const byS = useMemo(() => Object.fromEntries((quotes || []).map((q) => [q.symbol, q])), [quotes])
  useEffect(() => {
    if (!quotes) return
    checkAlerts(items, byS).forEach(({ symbol, alert, price }) => { markTriggered(symbol, alert.id); toast(`${symbol} is ${alert.type} ${fmtMoney(alert.price)} (now ${fmtMoney(price)})`, { tone: 'success', duration: 5000 }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes])
  const submit = (e) => { e.preventDefault(); const s = normalizeSymbol(input); if (!s) return; add(s); setInput(''); toast(`Added ${s}`, { tone: 'success' }) }
  const saveAlert = (symbol) => {
    const p = Number(alertPrice); const q = byS[symbol]
    if (!Number.isFinite(p) || p <= 0) { toast('Enter a valid price', { tone: 'error' }); return }
    addAlert(symbol, q && p < q.price ? 'below' : 'above', p); setAlertFor(null); setAlertPrice(''); toast('Alert saved', { tone: 'success' })
  }
  const exportCsv = () => downloadCSV('bluechip-watchlist', items.map((i) => ({ symbol: i.symbol, price: byS[i.symbol]?.price ?? '', changePct: byS[i.symbol]?.changePct ?? '', alerts: (i.alerts || []).map((a) => `${a.type} ${a.price}`).join('; ') })))
  return (
    <div className="space-y-8">
      <SectionHeader title="Watchlist" subtitle="Your tracked stocks with price alerts" action={<button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={!items.length}>Export CSV</button>} />
      <Card><form onSubmit={submit} className="flex flex-wrap gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add a ticker, e.g. NVDA" className="input max-w-xs" aria-label="Add ticker" /><button type="submit" className="btn btn-primary"><Plus size={18} />Add to watchlist</button></form></Card>
      {!items.length && <EmptyState icon={Star} title="Your watchlist is empty">Add tickers above, or press the Watch button on any stock page.</EmptyState>}
      <div className="grid gap-4 md:grid-cols-2 stagger">
        {items.map((it) => { const q = byS[it.symbol]; return (
          <Card key={it.symbol} className="min-w-0">
            <div className="flex items-center gap-3">
              <Logo symbol={it.symbol} size={44} />
              <div className="min-w-0 flex-1"><Link to={`/stock/${it.symbol}`} className="link text-xl">{it.symbol}</Link><div className="truncate text-sm text-muted">{q?.name || ''}</div></div>
              <Sparkline data={sparks[it.symbol] || []} width={110} height={36} />
              <div className="text-right">{loading && !q ? <Skeleton className="h-7 w-20" /> : q ? <><div className="num text-2xl font-bold">{fmtMoney(q.price)}</div><Change value={q.changePct} /></> : <span className="text-muted">No quote</span>}</div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(it.alerts || []).map((a) => <Badge key={a.id} tone={a.triggeredAt ? 'up' : 'accent'} className="gap-2"><Bell size={14} />{a.type} {fmtMoney(a.price)}{a.triggeredAt ? ` · hit ${fmtDate(a.triggeredAt)}` : ''}<button type="button" aria-label="Remove alert" onClick={() => removeAlert(it.symbol, a.id)} className="ml-1 hover:text-down">×</button></Badge>)}
              {alertFor === it.symbol ? (
                <span className="flex items-center gap-2"><input type="number" step="any" autoFocus value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveAlert(it.symbol)} placeholder={q ? q.price.toFixed(2) : 'Price'} className="input w-32" aria-label="Alert price" /><button type="button" className="btn btn-primary min-h-10" onClick={() => saveAlert(it.symbol)}>Save</button><button type="button" className="btn btn-ghost min-h-10" onClick={() => setAlertFor(null)}>Cancel</button></span>
              ) : <button type="button" className="chip min-h-10 text-sm" onClick={() => { setAlertFor(it.symbol); setAlertPrice('') }}><Bell size={16} /> Add alert</button>}
              <button type="button" className="btn btn-ghost ml-auto min-h-10 text-sm text-muted hover:text-down" onClick={() => { remove(it.symbol); toast(`Removed ${it.symbol}`) }}><Trash size={16} /> Remove</button>
            </div>
          </Card>
        ) })}
      </div>
      {items.length > 0 && <p className="text-sm text-muted">Alerts are checked whenever prices refresh while Bluechip is open (about once a minute).</p>}
      <button type="button" className="sr-only" onClick={() => navigate('/')}>Home</button>
    </div>
  )
}
