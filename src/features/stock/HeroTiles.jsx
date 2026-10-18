import { useMemo } from 'react'
import { Card, CopyValue, Skeleton } from '../../components/ui'
import { Sparkline } from '../../components/Sparkline'
import { ArrowUp, ArrowDown } from '../../components/Icons'
import { fmtPct, isNum } from '../../lib/format'

/**
 * Four big tiles: ROE, Gross Margin, Sales Y/Y, Shares Outstanding Y/Y.
 * Each shows the current value, a green/red arrow vs. the prior year, and a multi-year sparkline.
 */
export function HeroTiles({ snapshot, annual }) {
  const m = snapshot?.metrics || {}
  const tiles = useMemo(() => {
    const A = annual || []
    const series = {
      roe: A.map((y) => (y.equity ? (y.netIncome / y.equity) * 100 : null)),
      gross: A.map((y) => (y.revenue ? (y.grossProfit / y.revenue) * 100 : null)),
      sales: A.map((y, i) => (i > 0 && A[i - 1].revenue ? ((y.revenue - A[i - 1].revenue) / Math.abs(A[i - 1].revenue)) * 100 : null)),
      shares: A.map((y, i) => (i > 0 && A[i - 1].sharesOutstanding ? ((y.sharesOutstanding - A[i - 1].sharesOutstanding) / A[i - 1].sharesOutstanding) * 100 : null)),
    }
    const clean = (arr) => arr.filter(isNum)
    const prior = (arr) => { const c = clean(arr); return c.length >= 2 ? c[c.length - 2] : null }
    return [
      { key: 'roe', label: 'Return on equity', value: m.roe, trend: clean(series.roe), prior: prior(series.roe), goodWhenUp: true, hint: 'Profit generated per dollar of shareholder equity' },
      { key: 'grossMargin', label: 'Gross margin', value: m.grossMargin, trend: clean(series.gross), prior: prior(series.gross), goodWhenUp: true, hint: 'Share of revenue left after direct costs' },
      { key: 'salesYoY', label: 'Sales growth Y/Y', value: m.salesYoY, trend: clean(series.sales), prior: prior(series.sales), goodWhenUp: true, hint: 'Trailing-twelve-month revenue vs. a year ago' },
      { key: 'sharesOutstandingYoY', label: 'Shares outstanding Y/Y', value: m.sharesOutstandingYoY, trend: clean(series.shares), prior: prior(series.shares), goodWhenUp: false, hint: 'Negative means buybacks are shrinking the share count' },
    ]
  }, [annual, m])
  if (!snapshot) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Card key={i}><Skeleton className="h-4 w-28" /><Skeleton className="mt-3 h-12 w-32" /><Skeleton className="mt-3 h-10" /></Card>)}</div>
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
      {tiles.map((t) => {
        const v = t.value
        const dir = isNum(v) && isNum(t.prior) ? (v >= t.prior ? 'up' : 'down') : isNum(v) ? (v >= 0 ? 'up' : 'down') : null
        const good = dir == null ? null : t.goodWhenUp ? dir === 'up' : dir === 'down'
        const color = good == null ? 'text-muted' : good ? 'text-up' : 'text-down'
        return (
          <Card key={t.key} data-metric={t.key} title={t.hint}>
            <div className="label">{t.label}</div>
            <div className="mt-1 flex items-center gap-2">
              <CopyValue value={v} display={fmtPct(v, 1, { sign: t.key === 'salesYoY' || t.key === 'sharesOutstandingYoY' })} className="text-4xl font-extrabold tracking-tight sm:text-5xl" />
              {dir && <span className={`rounded-full bg-surface-2 p-1.5 ${color}`}>{dir === 'up' ? <ArrowUp size={22} /> : <ArrowDown size={22} />}</span>}
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <Sparkline data={t.trend} width={160} height={44} color={good == null ? 'var(--muted)' : good ? 'var(--up)' : 'var(--down)'} className="w-full" />
            </div>
            <div className="mt-1 text-sm text-muted">{t.trend.length ? `${t.trend.length}-year trend` : 'No history'}{isNum(t.prior) ? ` · prior ${fmtPct(t.prior, 1)}` : ''}</div>
          </Card>
        )
      })}
    </div>
  )
}
