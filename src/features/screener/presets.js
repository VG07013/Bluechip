/** Preset screens. Each filter: { key, op: '>' | '<' | 'between', value, value2? } */
export const PRESETS = [
  { id: 'growth', name: 'High growth', description: 'Sales up 15%+ and EPS up 15%+ over the past year', filters: [{ key: 'salesYoY', op: '>', value: 15 }, { key: 'epsYoY', op: '>', value: 15 }] },
  { id: 'quality', name: 'Quality compounders', description: 'ROE above 20%, gross margin above 40%, modest debt', filters: [{ key: 'roe', op: '>', value: 20 }, { key: 'grossMargin', op: '>', value: 40 }, { key: 'debtEq', op: '<', value: 1 }] },
  { id: 'dividend', name: 'Dividend payers', description: 'Pays a dividend with a sustainable payout ratio', filters: [{ key: 'dividendTTM', op: '>', value: 0 }, { key: 'payout', op: 'between', value: 10, value2: 80 }] },
  { id: 'value', name: 'Value', description: 'P/E under 18 and P/B under 3', filters: [{ key: 'pe', op: 'between', value: 0, value2: 18 }, { key: 'pb', op: '<', value: 3 }] },
  { id: 'momentum', name: 'Momentum', description: 'Up over the past quarter and above the 50 & 200-day averages', filters: [{ key: 'perfQuarter', op: '>', value: 0 }, { key: 'sma50', op: '>', value: 0 }, { key: 'sma200', op: '>', value: 0 }] },
  { id: 'lowdebt', name: 'Fortress balance sheet', description: 'Current ratio above 1.5 and debt/equity under 0.5', filters: [{ key: 'currentRatio', op: '>', value: 1.5 }, { key: 'debtEq', op: '<', value: 0.5 }] },
  { id: 'megacap', name: 'Mega caps', description: 'Market cap above $200B', filters: [{ key: 'marketCap', op: '>', value: 200e9 }] },
  { id: 'oversold', name: 'Oversold', description: 'RSI under 35', filters: [{ key: 'rsi', op: '<', value: 35 }] },
]

/** Serialize filters to a compact URL string and back: "roe>20,grossMargin>40,pe:0:18" */
export function filtersToParam(filters) {
  return filters.map((f) => (f.op === 'between' ? `${f.key}:${f.value}:${f.value2}` : `${f.key}${f.op}${f.value}`)).join(',')
}
export function paramToFilters(param) {
  if (!param) return []
  return param.split(',').map((s) => {
    let m = s.match(/^(\w+):(-?[\d.e+]+):(-?[\d.e+]+)$/)
    if (m) return { key: m[1], op: 'between', value: Number(m[2]), value2: Number(m[3]) }
    m = s.match(/^(\w+)([<>])(-?[\d.e+]+)$/)
    if (m) return { key: m[1], op: m[2], value: Number(m[3]) }
    return null
  }).filter(Boolean)
}
export function applyFilters(rows, filters, { sector, industry, search } = {}) {
  const q = (search || '').toLowerCase()
  return rows.filter((r) => {
    if (sector && r.sector !== sector) return false
    if (industry && r.industry !== industry) return false
    if (q && !(r.symbol.toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q))) return false
    return filters.every((f) => {
      const v = r[f.key]
      if (v == null || Number.isNaN(v)) return false
      if (f.op === '>') return v > f.value
      if (f.op === '<') return v < f.value
      return v >= f.value && v <= f.value2
    })
  })
}
