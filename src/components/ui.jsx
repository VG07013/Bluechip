/**
 * Small shared building blocks. Each is intentionally tiny so pages read cleanly.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtPct, isNum, fmtByKind } from '../lib/format'
import { useToast } from '../hooks/useToast'
import { ArrowUp, ArrowDown, Alert, Download, Info } from './Icons'
import { downloadCSV } from '../lib/csv'

export function Card({ className = '', hover = false, as: Tag = 'div', children, ...rest }) {
  return <Tag className={`card p-5 sm:p-6 ${hover ? 'card-hover' : ''} ${className}`} {...rest}>{children}</Tag>
}

export function SectionHeader({ title, subtitle, action, id }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3" id={id}>
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** Skeleton placeholder block. */
export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}
export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`card p-6 ${className}`}>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className="mt-3 h-4" style={{ width: `${90 - i * 15}%` }} />)}
    </div>
  )
}

/** Green/red text for gains/losses, with arrow. */
export function Change({ value, kind = 'pct', digits = 2, arrow = true, className = '', size = '' }) {
  if (!isNum(value)) return <span className={`text-muted ${className}`}>—</span>
  const up = value > 0, flat = value === 0
  const color = flat ? 'text-muted' : up ? 'text-up' : 'text-down'
  const text = kind === 'pct' ? fmtPct(value, digits, { sign: true }) : (up ? '+' : '') + value.toFixed(digits)
  return (
    <span className={`inline-flex items-center gap-1 font-semibold num ${color} ${size} ${className}`}>
      {arrow && !flat && (up ? <ArrowUp size="1em" /> : <ArrowDown size="1em" />)}{text}
    </span>
  )
}

/** Clicking any value copies it (with "Copied" toast and a pulse). */
export function CopyValue({ value, display, className = '', title }) {
  const toast = useToast()
  const [pulse, setPulse] = useState(false)
  const text = display ?? String(value ?? '')
  const raw = value == null ? text : String(value)
  const onCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(raw).then(() => { toast('Copied ' + text); setPulse(true); setTimeout(() => setPulse(false), 600) }).catch(() => toast('Could not copy', { tone: 'error' }))
  }
  return (
    <button type="button" onClick={onCopy} title={title || 'Click to copy'} className={`num cursor-copy rounded-md px-1 -mx-1 text-left transition-colors hover:bg-accent-soft ${pulse ? 'pulse-once' : ''} ${className}`}>
      {text}
    </button>
  )
}

/** Label + big number stat, used in hero rows. */
export function Stat({ label, value, kind, change, children, className = '', big = false }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="label">{label}</span>
      <div className="flex items-baseline gap-2">
        <CopyValue value={value} display={fmtByKind(value, kind)} className={`${big ? 'text-4xl sm:text-5xl' : 'text-2xl'} font-bold leading-tight tracking-tight`} />
        {isNum(change) && <Change value={change} />}
      </div>
      {children}
    </div>
  )
}

/** Company logo with lettermark fallback. */
export function Logo({ symbol, src, size = 48, className = '' }) {
  const [err, setErr] = useState(false)
  const letters = String(symbol || '?').replace('^', '').slice(0, 2)
  if (src && !err) return <img src={src} alt="" width={size} height={size} onError={() => setErr(true)} className={`rounded-2xl bg-surface-2 object-contain ${className}`} style={{ width: size, height: size }} />
  return (
    <div aria-hidden="true" className={`flex items-center justify-center rounded-2xl bg-accent-soft font-bold text-accent ${className}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>{letters}</div>
  )
}

export function EmptyState({ icon: Icon = Info, title, children, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <div className="rounded-full bg-accent-soft p-4 text-accent"><Icon size={30} /></div>
      <h3 className="text-xl font-bold">{title}</h3>
      {children && <p className="max-w-md text-muted">{children}</p>}
      {action}
    </div>
  )
}

/** Friendly error block for bad tickers / API failures. */
export function ErrorMessage({ error, title, onRetry, children }) {
  const msg = error?.notFound ? error.message : (error?.message || 'Something went wrong while loading this data.')
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 border-down/30 p-10 text-center">
      <div className="rounded-full bg-down-soft p-4 text-down"><Alert size={30} /></div>
      <h3 className="text-xl font-bold">{title || (error?.notFound ? 'Ticker not found' : 'We hit a snag')}</h3>
      <p className="max-w-lg text-muted">{msg}{error?.notFound ? ' Double-check the spelling, or try searching by company name.' : ''}</p>
      <div className="flex gap-3">
        {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}>Try again</button>}
        {children}
      </div>
    </div>
  )
}

/** Toggle group used for chart ranges, period switches, etc. */
export function Segmented({ options, value, onChange, size = 'md', ariaLabel }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex flex-wrap gap-1 rounded-2xl bg-surface-2 p-1">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o
        const active = opt.value === value
        return (
          <button key={opt.value} role="tab" aria-selected={active} type="button" onClick={() => onChange(opt.value)}
            className={`rounded-xl px-3 font-semibold transition-colors ${size === 'sm' ? 'min-h-9 text-sm' : 'min-h-11 text-base'} ${active ? 'bg-surface text-accent shadow-card' : 'text-text-2 hover:text-text'}`}>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/** Small pill badge. */
export function Badge({ tone = 'neutral', children, className = '' }) {
  const tones = {
    neutral: 'bg-surface-2 text-text-2 border-border', accent: 'bg-accent-soft text-accent border-transparent',
    up: 'bg-up-soft text-up border-transparent', down: 'bg-down-soft text-down border-transparent',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-bold ${tones[tone]} ${className}`}>{children}</span>
}

/** Semi-circular gauge 0..100. */
export function Gauge({ value, label, size = 180, from = 'var(--down)', to = 'var(--up)', caption }) {
  const v = isNum(value) ? Math.max(0, Math.min(100, value)) : 0
  const r = size / 2 - 12, cx = size / 2, cy = size / 2
  const start = Math.PI, end = Math.PI + (v / 100) * Math.PI
  const arc = (a0, a1) => { const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1); return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}` }
  const id = 'g' + Math.round(size + v)
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`} role="img" aria-label={`${label}: ${Math.round(v)} out of 100`}>
        <defs><linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} /></linearGradient></defs>
        <path d={arc(start, 2 * Math.PI)} stroke="var(--surface-3)" strokeWidth="14" fill="none" strokeLinecap="round" />
        {v > 0 && <path d={arc(start, end)} stroke={`url(#${id})`} strokeWidth="14" fill="none" strokeLinecap="round" style={{ transition: 'd .5s ease' }} />}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={size * 0.22} fontWeight="800" fill="var(--text)" className="num">{isNum(value) ? Math.round(v) : '—'}</text>
      </svg>
      <div className="-mt-1 text-center text-base font-bold">{label}</div>
      {caption && <div className="text-center text-sm text-muted">{caption}</div>}
    </div>
  )
}

/** Sortable, exportable data table. columns: [{key,label,kind,value?(row),render?(row),align}] */
export function DataTable({ rows, columns, defaultSort, filename = 'bluechip', rowKey = 'symbol', onRowClick, emptyText = 'Nothing to show yet.', maxHeight, caption }) {
  const [sort, setSort] = useState(defaultSort || null)
  const sorted = [...rows]
  if (sort) {
    const col = columns.find((c) => c.key === sort.key)
    const get = (r) => (col?.value ? col.value(r) : r[sort.key])
    sorted.sort((a, b) => {
      const va = get(a), vb = get(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }
  const toggle = (key) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  const exportCsv = () => downloadCSV(filename, sorted, columns.map((c) => ({ label: c.label, value: (r) => (c.value ? c.value(r) : r[c.key]) })))
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        {caption ? <div className="text-sm text-muted">{caption}</div> : <span />}
        <button type="button" className="btn btn-ghost min-h-10 text-sm" onClick={exportCsv} disabled={!rows.length}><Download size={18} /> Export CSV</button>
      </div>
      <div className="table-wrap rounded-2xl border border-border" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
        <table className="table">
          <thead>
            <tr>{columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'text-right' : ''}>
                <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-text" aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  {c.label}{sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </button>
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan={columns.length} className="py-10 text-center text-muted">{emptyText}</td></tr>}
            {sorted.map((r, i) => (
              <tr key={r[rowKey] ?? i} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'cursor-pointer' : ''}>
                {columns.map((c) => {
                  const v = c.value ? c.value(r) : r[c.key]
                  return <td key={c.key} className={`${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>{c.render ? c.render(r, v) : (c.kind ? <CopyValue value={v} display={fmtByKind(v, c.kind)} /> : v ?? '—')}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Link to a stock page, styled as a ticker chip. */
export function TickerLink({ symbol, className = '' }) {
  return <Link to={`/stock/${encodeURIComponent(symbol)}`} className={`link font-bold ${className}`}>{symbol}</Link>
}

/** Scrolls to and highlights a hash target (used by metric/section search jumps). */
export function useHashHighlight(deps = []) {
  const done = useRef('')
  useEffect(() => {
    const h = decodeURIComponent(window.location.hash.slice(1))
    if (!h || done.current === h + deps.join()) return
    const t = setTimeout(() => {
      const el = document.getElementById(h) || document.querySelector(`[data-metric="${h}"]`)
      if (el) {
        done.current = h + deps.join()
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('highlight-target'); setTimeout(() => el.classList.remove('highlight-target'), 2000)
      }
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.location.hash, ...deps])
}
