/** Tiny inline SVG line chart. Colored by performance unless `color` given. */
export function Sparkline({ data = [], width = 120, height = 36, color, strokeWidth = 2, fill = true, className = '' }) {
  const vals = data.filter((v) => typeof v === 'number' && Number.isFinite(v))
  if (vals.length < 2) return <svg width={width} height={height} className={className} aria-hidden="true" />
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1
  const step = width / (vals.length - 1)
  const pts = vals.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)])
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const up = vals[vals.length - 1] >= vals[0]
  const stroke = color || (up ? 'var(--up)' : 'var(--down)')
  const id = 'sp' + Math.abs(Math.round(vals[0] * 100 + vals.length))
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      {fill && (
        <>
          <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={stroke} stopOpacity=".25" /><stop offset="1" stopColor={stroke} stopOpacity="0" /></linearGradient></defs>
          <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
