import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getScreenerRows } from '../../data'
import { squarify } from './treemap'
import { SectionHeader, Segmented, Skeleton, Card } from '../../components/ui'
import { fmtPct, fmtBigMoney, isNum, clamp } from '../../lib/format'
import { ShareButton } from '../layout/ShareButton'

const PERIODS = [{ value: 'change', label: 'Day', scale: 4 }, { value: 'perfWeek', label: 'Week', scale: 8 }, { value: 'perfMonth', label: 'Month', scale: 15 }, { value: 'perfQuarter', label: 'Quarter', scale: 25 }, { value: 'perfHalfY', label: '6 months', scale: 35 }, { value: 'perfYear', label: 'Year', scale: 50 }, { value: 'perfYTD', label: 'YTD', scale: 40 }]

/** Blend between down (red) → platinum neutral → up (green) by performance. */
function colorFor(v, scale) {
  if (!isNum(v)) return 'var(--surface-3)'
  const t = clamp(v / scale, -1, 1)
  const pct = Math.round(Math.abs(t) * 85 + 10)
  return t >= 0 ? `color-mix(in srgb, var(--up) ${pct}%, var(--surface-3))` : `color-mix(in srgb, var(--down) ${pct}%, var(--surface-3))`
}

/** Market heatmap: sectors sized by market cap, tiles colored by performance over a selectable period. */
export function HeatmapPage() {
  const [params, setParams] = useSearchParams()
  const period = PERIODS.find((p) => p.value === params.get('p')) || PERIODS[0]
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState(null)
  const navigate = useNavigate()
  useEffect(() => { let alive = true; getScreenerRows((r) => alive && setRows(r)).then((r) => { if (alive) { setRows(r); setLoading(false) } }); return () => { alive = false } }, [])

  const W = 1200, H = 720
  const layout = useMemo(() => {
    const bySector = {}
    rows.forEach((r) => { if (!isNum(r.marketCap)) return; (bySector[r.sector || 'Other'] ||= []).push(r) })
    const sectors = Object.entries(bySector).map(([name, items]) => ({ name, items, value: items.reduce((a, b) => a + b.marketCap, 0) }))
    const pad = 4, head = 26
    return squarify(sectors, 0, 0, W, H).map((s) => ({
      ...s,
      tiles: squarify(s.items.map((r) => ({ ...r, value: r.marketCap })), s.x + pad, s.y + head, Math.max(0, s.w - pad * 2), Math.max(0, s.h - head - pad)),
    }))
  }, [rows])
  const key = period.value
  return (
    <div className="space-y-6">
      <SectionHeader title="Market heatmap" subtitle="Tile size is market cap. Color is performance for the selected period. Click a tile to open the stock." action={<div className="flex flex-wrap gap-2"><Segmented options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} value={period.value} onChange={(v) => setParams({ p: v }, { replace: true })} ariaLabel="Period" /><ShareButton /></div>} />
      <div className="flex items-center gap-3 text-sm text-muted"><span className="inline-block h-4 w-24 rounded" style={{ background: 'linear-gradient(90deg, var(--down), var(--surface-3), var(--up))' }} />−{period.scale}% to +{period.scale}%</div>
      {loading && rows.length === 0 ? <Skeleton className="w-full" style={{ aspectRatio: '5/3' }} /> : (
        <Card className="relative p-2 sm:p-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Market heatmap">
            {layout.map((s) => (
              <g key={s.name}>
                <rect x={s.x + 1} y={s.y + 1} width={Math.max(0, s.w - 2)} height={Math.max(0, s.h - 2)} rx="10" fill="var(--surface-2)" stroke="var(--border)" />
                <text x={s.x + 10} y={s.y + 19} fontSize="14" fontWeight="800" fill="var(--text-2)" style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.w > 90 ? s.name : ''}</text>
                {s.tiles.map((t) => {
                  const v = t[key]
                  const big = t.w > 54 && t.h > 34
                  return (
                    <g key={t.symbol} className="cursor-pointer" tabIndex={0} role="link" aria-label={`${t.symbol} ${fmtPct(v, 2, { sign: true })}`}
                      onClick={() => navigate(`/stock/${t.symbol}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/stock/${t.symbol}`)}
                      onMouseEnter={() => setHover(t)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(t)} onBlur={() => setHover(null)}>
                      <rect x={t.x + 1.5} y={t.y + 1.5} width={Math.max(0, t.w - 3)} height={Math.max(0, t.h - 3)} rx="7" fill={colorFor(v, period.scale)} stroke={hover?.symbol === t.symbol ? 'var(--accent)' : 'transparent'} strokeWidth="3" style={{ transition: 'fill .3s' }} />
                      {big && <text x={t.x + t.w / 2} y={t.y + t.h / 2 - 2} textAnchor="middle" fontSize={Math.min(22, t.w / 4.5)} fontWeight="800" fill="var(--text)">{t.symbol}</text>}
                      {big && <text x={t.x + t.w / 2} y={t.y + t.h / 2 + Math.min(18, t.w / 5)} textAnchor="middle" fontSize={Math.min(15, t.w / 6)} fontWeight="600" fill="var(--text-2)" className="num">{fmtPct(v, 1, { sign: true })}</text>}
                    </g>
                  )
                })}
              </g>
            ))}
          </svg>
          {hover && (
            <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card-lg fade-in">
              <div className="text-lg font-bold">{hover.symbol} <span className="text-sm font-medium text-muted">{hover.name}</span></div>
              <div className="num text-sm">{period.label}: <b className={hover[key] >= 0 ? 'text-up' : 'text-down'}>{fmtPct(hover[key], 2, { sign: true })}</b> · Mkt cap {fmtBigMoney(hover.marketCap)}</div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
