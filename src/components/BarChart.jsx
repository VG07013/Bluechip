import { useState } from 'react'
import { fmtBigMoney, fmtPct, fmtMoney, isNum } from '../lib/format'

/**
 * Simple responsive SVG bar/line chart for financial statements.
 * series: [{ key, label, color?, type:'bar'|'line' }], data: [{ label, [key]: number }]
 * kind: 'bigmoney' | 'pct' | 'money'
 */
export function BarChart({ data, series, kind = 'bigmoney', height = 240 }) {
  const [hover, setHover] = useState(null)
  const fmt = kind === 'pct' ? (v) => fmtPct(v, 1) : kind === 'money' ? (v) => fmtMoney(v) : (v) => fmtBigMoney(v, 1)
  const W = 640, H = height, padL = 8, padR = 8, padT = 16, padB = 36
  const vals = data.flatMap((d) => series.map((s) => d[s.key])).filter(isNum)
  if (!vals.length) return <div className="flex h-40 items-center justify-center text-muted">No data available</div>
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals)
  const span = max - min || 1
  const y = (v) => padT + (H - padT - padB) * (1 - (v - min) / span)
  const groupW = (W - padL - padR) / data.length
  const bars = series.filter((s) => s.type !== 'line')
  const lines = series.filter((s) => s.type === 'line')
  const barW = Math.min(44, (groupW * 0.7) / Math.max(1, bars.length))
  const palette = ['var(--accent)', 'var(--muted)', 'var(--border-strong)', 'var(--accent-hover)']
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={series.map((s) => s.label).join(', ')}>
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--border-strong)" />
        {data.map((d, i) => {
          const gx = padL + i * groupW
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={gx} y={padT} width={groupW} height={H - padT - padB} fill={hover === i ? 'var(--surface-2)' : 'transparent'} rx="8" />
              {bars.map((s, si) => {
                const v = d[s.key]
                if (!isNum(v)) return null
                const x = gx + groupW / 2 - (bars.length * barW) / 2 + si * barW
                const top = Math.min(y(v), y(0)), h = Math.abs(y(v) - y(0))
                return <rect key={s.key} x={x + 2} y={top} width={barW - 4} height={Math.max(2, h)} rx="6" fill={v < 0 ? 'var(--down)' : s.color || palette[si % palette.length]} opacity={hover == null || hover === i ? 1 : 0.55} style={{ transition: 'opacity .15s' }} />
              })}
              <text x={gx + groupW / 2} y={H - 12} textAnchor="middle" fontSize="13" fill="var(--muted)" fontWeight="600">{d.label}</text>
            </g>
          )
        })}
        {lines.map((s, li) => {
          const pts = data.map((d, i) => (isNum(d[s.key]) ? `${padL + i * groupW + groupW / 2},${y(d[s.key])}` : null)).filter(Boolean)
          return <polyline key={s.key} points={pts.join(' ')} fill="none" stroke={s.color || palette[(li + 1) % palette.length]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-xl border border-border bg-surface px-4 py-2 text-sm shadow-card-lg">
          <div className="font-bold">{data[hover].label}</div>
          {series.map((s) => <div key={s.key} className="flex justify-between gap-4"><span className="text-muted">{s.label}</span><span className="num font-semibold">{fmt(data[hover][s.key])}</span></div>)}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        {series.map((s, i) => <span key={s.key} className="inline-flex items-center gap-2 text-text-2"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color || palette[(s.type === 'line' ? i + 1 : i) % palette.length] }} />{s.label}</span>)}
      </div>
    </div>
  )
}
