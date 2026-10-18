/** Squarified treemap layout (Bruls et al.). items: [{value, ...}] → adds x,y,w,h. */
export function squarify(items, x, y, w, h) {
  const total = items.reduce((a, b) => a + b.value, 0)
  if (!total || !items.length) return []
  const scaled = items.map((it) => ({ ...it, area: (it.value / total) * w * h })).sort((a, b) => b.area - a.area)
  const out = []
  let row = [], rx = x, ry = y, rw = w, rh = h
  const worst = (r, side) => { const s = r.reduce((a, b) => a + b.area, 0); const mx = Math.max(...r.map((i) => i.area)), mn = Math.min(...r.map((i) => i.area)); return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)) }
  const layout = (r) => {
    const s = r.reduce((a, b) => a + b.area, 0)
    const horizontal = rw >= rh
    if (horizontal) { const cw = s / rh; let cy = ry; r.forEach((i) => { const ih = i.area / cw; out.push({ ...i, x: rx, y: cy, w: cw, h: ih }); cy += ih }); rx += cw; rw -= cw }
    else { const ch = s / rw; let cx = rx; r.forEach((i) => { const iw = i.area / ch; out.push({ ...i, x: cx, y: ry, w: iw, h: ch }); cx += iw }); ry += ch; rh -= ch }
  }
  for (const it of scaled) {
    const side = Math.min(rw, rh)
    if (!row.length || worst([...row, it], side) <= worst(row, side)) row.push(it)
    else { layout(row); row = [it] }
  }
  if (row.length) layout(row)
  return out
}
