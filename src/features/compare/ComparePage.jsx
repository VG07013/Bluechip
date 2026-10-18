import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { createChart, LineSeries, ColorType, CrosshairMode } from 'lightweight-charts'
import { getSnapshot, getChartBars, normalizeSymbol } from '../../data'
import { FIELDS, GROUPS } from '../stock/snapshotFields'
import { Card, SectionHeader, CopyValue, Change, Logo, Skeleton, Segmented, EmptyState, ErrorMessage } from '../../components/ui'
import { fmtByKind, fmtMoney, isNum } from '../../lib/format'
import { ShareButton } from '../layout/ShareButton'
import { Close, Plus, Columns } from '../../components/Icons'
import { downloadCSV } from '../../lib/csv'

const COLORS = ['var(--accent)', 'var(--up)', 'var(--down)', 'var(--muted)']
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
const RANGES = ['1M', '3M', '6M', 'YTD', '1Y', '5Y']

/** Compare 2–4 stocks: every metric in rows with the best value highlighted, plus overlaid price charts. */
export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const symbols = useMemo(() => [...new Set((params.get('s') || '').split(',').map(normalizeSymbol).filter(Boolean))].slice(0, 4), [params])
  const [snaps, setSnaps] = useState({})
  const [errors, setErrors] = useState({})
  const [input, setInput] = useState('')
  useEffect(() => {
    symbols.forEach((s) => { if (!snaps[s] && !errors[s]) getSnapshot(s).then((d) => setSnaps((x) => ({ ...x, [s]: d }))).catch((e) => setErrors((x) => ({ ...x, [s]: e }))) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols])
  const set = (list) => setParams(list.length ? { s: list.join(',') } : {}, { replace: true })
  const add = (e) => { e.preventDefault(); const s = normalizeSymbol(input); if (s && !symbols.includes(s) && symbols.length < 4) set([...symbols, s]); setInput('') }
  const loaded = symbols.map((s) => snaps[s]).filter(Boolean)
  const exportCsv = () => downloadCSV('bluechip-compare', FIELDS.map((f) => ({ Metric: f.label, ...Object.fromEntries(loaded.map((s) => [s.symbol, s.metrics[f.key] ?? ''])) })))

  return (
    <div className="space-y-8">
      <SectionHeader title="Compare" subtitle="Two to four stocks side by side. The better value in each row is highlighted." action={<div className="flex gap-2"><ShareButton /><button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={loaded.length < 1}>Export CSV</button></div>} />
      <Card>
        <form onSubmit={add} className="flex flex-wrap items-center gap-2">
          {symbols.map((s, i) => (
            <span key={s} className="chip chip-active" style={{ background: COLORS[i], borderColor: COLORS[i] }}>{s}<button type="button" aria-label={`Remove ${s}`} onClick={() => set(symbols.filter((x) => x !== s))}><Close size={18} /></button></span>
          ))}
          {symbols.length < 4 && <><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add ticker (e.g. MSFT)" className="input w-56" aria-label="Add ticker" /><button type="submit" className="btn btn-primary"><Plus size={18} />Add</button></>}
          {symbols.length === 0 && <span className="text-muted">Try: <button type="button" className="link" onClick={() => set(['AAPL', 'MSFT', 'GOOGL'])}>AAPL vs MSFT vs GOOGL</button></span>}
        </form>
        {Object.entries(errors).map(([s, e]) => <p key={s} className="mt-3 text-down">{s}: {e.message} <button type="button" className="link" onClick={() => { set(symbols.filter((x) => x !== s)); setErrors((x) => { const { [s]: _, ...rest } = x; return rest }) }}>Remove</button></p>)}
      </Card>

      {symbols.length < 2 && <EmptyState icon={Columns} title="Add at least two tickers to compare">Pick stocks from the same industry for the most useful comparison.</EmptyState>}

      {symbols.length >= 1 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(2, symbols.length)}, minmax(0, 1fr))` }}>
          {symbols.map((s, i) => { const d = snaps[s]; return (
            <Card key={s} className="min-w-0">
              {d ? (<>
                <div className="flex items-center gap-2"><Logo symbol={s} src={d.logo} size={36} /><div className="min-w-0"><Link to={`/stock/${s}`} className="link text-lg">{s}</Link><div className="truncate text-sm text-muted">{d.name}</div></div></div>
                <div className="num mt-3 text-2xl font-bold sm:text-3xl">{fmtMoney(d.quote.price)}</div><Change value={d.quote.changePct} />
                <div className="mt-2 h-1.5 rounded-full" style={{ background: COLORS[i] }} />
              </>) : errors[s] ? <p className="text-down">Not found</p> : <><Skeleton className="h-9 w-9 rounded-2xl" /><Skeleton className="mt-3 h-8 w-24" /></>}
            </Card>
          ) })}
        </div>
      )}

      {symbols.length >= 2 && <OverlayChart symbols={symbols} />}

      {loaded.length >= 2 && (
        <Card className="p-0 overflow-hidden">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Metric</th>{loaded.map((d, i) => <th key={d.symbol} className="text-right"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[symbols.indexOf(d.symbol)] }} /> {d.symbol}</th>)}</tr></thead>
              <tbody>
                {GROUPS.map((g) => (
                  <GroupRows key={g.id} group={g} loaded={loaded} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function GroupRows({ group, loaded }) {
  const fields = FIELDS.filter((f) => f.group === group.id)
  return (
    <>
      <tr><td colSpan={loaded.length + 1} className="bg-surface-2 text-sm font-bold uppercase tracking-wide text-muted">{group.label}</td></tr>
      {fields.map((f) => {
        const vals = loaded.map((d) => d.metrics[f.key])
        let bestIdx = -1
        if (f.better) {
          const nums = vals.map((v, i) => (isNum(v) && (f.better !== 'low' || v > 0) ? { v, i } : null)).filter(Boolean)
          if (nums.length > 1) bestIdx = nums.reduce((a, b) => (f.better === 'high' ? (b.v > a.v ? b : a) : (b.v < a.v ? b : a))).i
        }
        return (
          <tr key={f.key}>
            <td className="text-text-2">{f.label}</td>
            {vals.map((v, i) => <td key={i} className={`text-right ${bestIdx === i ? 'bg-up-soft font-bold text-up' : ''}`}>{v == null ? <span className="text-muted">n/a</span> : <CopyValue value={v} display={fmtByKind(v, f.kind)} />}</td>)}
          </tr>
        )
      })}
    </>
  )
}

/** Overlaid, normalized (% from start) price lines. */
function OverlayChart({ symbols }) {
  const [range, setRange] = useState('1Y')
  const [series, setSeries] = useState({})
  const [err, setErr] = useState(null)
  const ref = useRef(null)
  useEffect(() => {
    let alive = true
    setErr(null)
    Promise.all(symbols.map((s) => getChartBars(s, range).then((r) => [s, r.bars]).catch(() => [s, []]))).then((pairs) => { if (alive) setSeries(Object.fromEntries(pairs)) }).catch((e) => alive && setErr(e))
    return () => { alive = false }
  }, [symbols, range])
  useEffect(() => {
    if (!ref.current || !Object.keys(series).length) return
    const chart = createChart(ref.current, {
      autoSize: true, layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: css('--muted'), fontFamily: 'Inter, system-ui', fontSize: 13, attributionLogo: false },
      grid: { vertLines: { color: 'transparent' }, horzLines: { color: css('--border') } }, rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: CrosshairMode.Normal }, localization: { priceFormatter: (p) => `${p >= 0 ? '+' : ''}${p.toFixed(1)}%` },
    })
    symbols.forEach((s, i) => {
      const bars = series[s] || []
      if (bars.length < 2) return
      const base = bars[0].close
      const line = chart.addSeries(LineSeries, { color: css(COLORS[i].slice(4, -1)), lineWidth: 2.5, title: s, priceLineVisible: false })
      line.setData(bars.map((b) => ({ time: b.time, value: ((b.close - base) / base) * 100 })))
    })
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [series, symbols])
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Price performance (% change)</h3><Segmented options={RANGES} value={range} onChange={setRange} ariaLabel="Range" /></div>
      {err && <ErrorMessage error={err} />}
      <div ref={ref} style={{ height: 360 }} />
    </Card>
  )
}
