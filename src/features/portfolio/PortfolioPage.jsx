import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePortfolio } from './usePortfolio'
import { getQuotes, normalizeSymbol } from '../../data'
import { useQuery } from '../../hooks/useQuery'
import { Card, SectionHeader, Change, CopyValue, DataTable, EmptyState, Skeleton } from '../../components/ui'
import { fmtMoney, fmtPct, isNum } from '../../lib/format'
import { useToast } from '../../hooks/useToast'
import { Briefcase, Plus, Trash } from '../../components/Icons'

/** Portfolio tracker: shares + cost basis → market value, total and daily P&L, allocation and a daily summary. */
export function PortfolioPage() {
  const { holdings, add, remove } = usePortfolio()
  const toast = useToast()
  const [form, setForm] = useState({ symbol: '', shares: '', cost: '' })
  const symbols = useMemo(() => [...new Set(holdings.map((h) => h.symbol))], [holdings])
  const { data: quotes, loading } = useQuery('pf:' + symbols.join(','), () => getQuotes(symbols), { enabled: symbols.length > 0 })
  const byS = useMemo(() => Object.fromEntries((quotes || []).map((q) => [q.symbol, q])), [quotes])
  const rows = useMemo(() => holdings.map((h) => {
    const q = byS[h.symbol]
    const value = q ? q.price * h.shares : null, cost = h.costBasis * h.shares
    return { ...h, name: q?.name, price: q?.price ?? null, value, cost, gain: value != null ? value - cost : null, gainPct: value != null && cost ? ((value - cost) / cost) * 100 : null, dayGain: q ? q.change * h.shares : null, dayPct: q?.changePct ?? null }
  }), [holdings, byS])
  const totals = useMemo(() => {
    const t = rows.reduce((a, r) => ({ value: a.value + (r.value || 0), cost: a.cost + r.cost, day: a.day + (r.dayGain || 0) }), { value: 0, cost: 0, day: 0 })
    return { ...t, gain: t.value - t.cost, gainPct: t.cost ? ((t.value - t.cost) / t.cost) * 100 : null, dayPct: t.value - t.day ? (t.day / (t.value - t.day)) * 100 : null }
  }, [rows])
  const submit = (e) => {
    e.preventDefault()
    const s = normalizeSymbol(form.symbol), sh = Number(form.shares), c = Number(form.cost)
    if (!s || !(sh > 0) || !(c >= 0)) { toast('Enter a ticker, share count and cost basis', { tone: 'error' }); return }
    add(s, sh, c); setForm({ symbol: '', shares: '', cost: '' }); toast(`Added ${sh} ${s}`, { tone: 'success' })
  }
  const best = rows.filter((r) => isNum(r.dayPct)).sort((a, b) => b.dayPct - a.dayPct)
  const summary = rows.length && quotes ? `Your portfolio is ${totals.day >= 0 ? 'up' : 'down'} ${fmtMoney(Math.abs(totals.day))} (${fmtPct(Math.abs(totals.dayPct ?? 0), 2)}) today${best.length ? `, led by ${best[0].symbol} (${fmtPct(best[0].dayPct, 2, { sign: true })})${best.length > 1 ? ` while ${best.at(-1).symbol} lagged (${fmtPct(best.at(-1).dayPct, 2, { sign: true })})` : ''}` : ''}. All-time you are ${totals.gain >= 0 ? 'up' : 'down'} ${fmtMoney(Math.abs(totals.gain))} on ${fmtMoney(totals.cost)} invested.` : null
  return (
    <div className="space-y-8">
      <SectionHeader title="Portfolio" subtitle="Enter shares and cost basis to track total and daily gain or loss" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
        {[['Total value', fmtMoney(totals.value), null], ['Total gain / loss', (totals.gain >= 0 ? '+' : '-') + fmtMoney(Math.abs(totals.gain)), totals.gainPct], ['Today', (totals.day >= 0 ? '+' : '-') + fmtMoney(Math.abs(totals.day)), totals.dayPct], ['Invested', fmtMoney(totals.cost), null]].map(([l, v, p]) => (
          <Card key={l}><div className="label">{l}</div>{loading && symbols.length ? <Skeleton className="mt-2 h-10 w-32" /> : <><CopyValue value={v} className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${l === 'Total gain / loss' || l === 'Today' ? (totals[l === 'Today' ? 'day' : 'gain'] >= 0 ? 'text-up' : 'text-down') : ''}`} />{isNum(p) && <Change value={p} />}</>}</Card>
        ))}
      </div>
      {summary && <Card className="border-l-4 border-l-accent"><div className="label mb-1">Daily summary</div><p className="text-lg">{summary}</p></Card>}
      <Card>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <label className="block"><span className="label">Ticker</span><input className="input mt-1" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="AAPL" /></label>
          <label className="block"><span className="label">Shares</span><input className="input mt-1" type="number" step="any" min="0" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} placeholder="10" /></label>
          <label className="block"><span className="label">Cost basis per share</span><input className="input mt-1" type="number" step="any" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="150.00" /></label>
          <button type="submit" className="btn btn-primary"><Plus size={18} />Add holding</button>
        </form>
      </Card>
      {!holdings.length ? <EmptyState icon={Briefcase} title="No holdings yet">Add your first position above. Everything stays in this browser.</EmptyState> : (
        <>
          <Card className="p-2 sm:p-3">
            <DataTable rows={rows} rowKey="id" filename="bluechip-portfolio" defaultSort={{ key: 'value', dir: 'desc' }} columns={[
              { key: 'symbol', label: 'Ticker', render: (r) => <Link to={`/stock/${r.symbol}`} className="link">{r.symbol}</Link> },
              { key: 'shares', label: 'Shares', kind: 'int', align: 'right' },
              { key: 'costBasis', label: 'Cost basis', kind: 'money', align: 'right' },
              { key: 'price', label: 'Price', kind: 'money', align: 'right' },
              { key: 'value', label: 'Value', kind: 'money', align: 'right' },
              { key: 'dayGain', label: 'Today', align: 'right', render: (r) => <span className="flex flex-col items-end"><span className={`num font-bold ${r.dayGain >= 0 ? 'text-up' : 'text-down'}`}>{isNum(r.dayGain) ? (r.dayGain >= 0 ? '+' : '-') + fmtMoney(Math.abs(r.dayGain)) : '—'}</span><Change value={r.dayPct} /></span> },
              { key: 'gain', label: 'Total gain', align: 'right', render: (r) => <span className="flex flex-col items-end"><span className={`num font-bold ${r.gain >= 0 ? 'text-up' : 'text-down'}`}>{isNum(r.gain) ? (r.gain >= 0 ? '+' : '-') + fmtMoney(Math.abs(r.gain)) : '—'}</span><Change value={r.gainPct} /></span> },
              { key: 'weight', label: 'Weight', align: 'right', value: (r) => (totals.value ? ((r.value || 0) / totals.value) * 100 : null), kind: 'pct' },
              { key: 'actions', label: '', render: (r) => <button type="button" aria-label={`Remove ${r.symbol}`} className="btn btn-ghost min-h-9 px-2 text-muted hover:text-down" onClick={() => remove(r.id)}><Trash size={18} /></button> },
            ]} />
          </Card>
          <Card>
            <div className="label mb-2">Allocation</div>
            <div className="flex h-6 w-full overflow-hidden rounded-full bg-surface-3">{rows.filter((r) => r.value).map((r, i) => <div key={r.id} title={`${r.symbol} ${fmtPct((r.value / totals.value) * 100, 1)}`} style={{ width: `${(r.value / totals.value) * 100}%`, background: `color-mix(in srgb, var(--accent) ${100 - (i % 5) * 18}%, var(--surface))` }} />)}</div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">{rows.filter((r) => r.value).map((r) => <span key={r.id}><b className="text-text">{r.symbol}</b> {fmtPct((r.value / totals.value) * 100, 1)}</span>)}</div>
          </Card>
        </>
      )}
    </div>
  )
}
