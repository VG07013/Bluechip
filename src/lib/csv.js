/** Export an array of row objects (or arrays) to a downloadable CSV file. */
export function toCSV(rows, columns) {
  const cols = columns || Object.keys(rows[0] || {})
  const esc = (v) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = cols.map((c) => esc(typeof c === 'string' ? c : c.label)).join(',')
  const body = rows.map((r) => cols.map((c) => esc(typeof c === 'string' ? r[c] : (c.value ? c.value(r) : r[c.key]))).join(','))
  return [header, ...body].join('\n')
}

export function downloadCSV(filename, rows, columns) {
  const csv = toCSV(rows, columns)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
