import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getScreenerRows } from '../../data'
import { SECTORS, INDUSTRIES } from '../../data/universe'
import { NUMERIC_FIELDS, FIELD_MAP } from '../stock/snapshotFields'
import { PRESETS, filtersToParam, paramToFilters, applyFilters } from './presets'
import { Card, SectionHeader, DataTable, Change, Logo, Skeleton, EmptyState } from '../../components/ui'
import { createPersistedStore } from '../../lib/store'
import { fmtByKind } from '../../lib/format'
import { ShareButton } from '../layout/ShareButton'
import { Close, Plus, Sliders, Trash } from '../../components/Icons'
import { useToast } from '../../hooks/useToast'

const savedStore = createPersistedStore('savedScreens', [])
const OPS = [{ value: '>', label: 'above' }, { value: '<', label: 'below' }, { value: 'between', label: 'between' }]

/** Screener: filter every stock by any metric with big filter chips; sortable, saveable, shareable. */
export function ScreenerPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const saved = savedStore.use()
  const filters = useMemo(() => paramToFilters(params.get('f')), [params])
  const sector = params.get('sector') || ''
  const industry = params.get('industry') || ''
  const sortKey = params.get('sort') || 'marketCap'
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ key: 'roe', op: '>', value: '', value2: '' })

  useEffect(() => {
    let alive = true
    setLoading(true)
    getScreenerRows((partial) => { if (alive) setRows(partial) }).then((r) => { if (alive) { setRows(r); setLoading(false) } }).catch(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const update = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true })
  }
  const setFilters = (f) => update({ f: filtersToParam(f) })
  const addFilter = () => {
    const v = Number(draft.value), v2 = Number(draft.value2)
    if (!Number.isFinite(v) || (draft.op === 'between' && !Number.isFinite(v2))) { toast('Enter a number for the filter', { tone: 'error' }); return }
    const f = { key: draft.key, op: draft.op, value: FIELD_MAP[draft.key].kind === 'bigmoney' || FIELD_MAP[draft.key].kind === 'big' ? v * 1e9 : v }
    if (draft.op === 'between') f.value2 = FIELD_MAP[draft.key].kind === 'bigmoney' || FIELD_MAP[draft.key].kind === 'big' ? v2 * 1e9 : v2
    setFilters([...filters.filter((x) => x.key !== f.key), f]); setAdding(false); setDraft({ key: 'roe', op: '>', value: '', value2: '' })
  }
  const results = useMemo(() => applyFilters(rows, filters, { sector, industry, search }), [rows, filters, sector, industry, search])
  const saveScreen = () => {
    const name = window.prompt('Name this screen', 'My screen')
    if (!name) return
    savedStore.set((s) => [...s.filter((x) => x.name !== name), { name, f: filtersToParam(filters), sector, industry }])
    toast(`Saved “${name}”`, { tone: 'success' })
  }
  const describe = (f) => { const d = FIELD_MAP[f.key]; const fmt = (v) => fmtByKind(v, d.kind); return `${d.label} ${f.op === 'between' ? `${fmt(f.value)} – ${fmt(f.value2)}` : `${f.op === '>' ? 'above' : 'below'} ${fmt(f.value)}`}` }
  const extraCols = filters.map((f) => f.key).filter((k) => !['marketCap', 'pe', 'roe', 'grossMargin', 'salesYoY', 'change', 'price'].includes(k))
  const columns = [
    { key: 'symbol', label: 'Ticker', render: (r) => <span className="flex items-center gap-2"><Logo symbol={r.symbol} size={28} /><span className="font-bold text-accent">{r.symbol}</span></span> },
    { key: 'name', label: 'Company', render: (r) => <span className="block max-w-[14rem] truncate">{r.name}</span> },
    { key: 'sector', label: 'Sector' },
    { key: 'price', label: 'Price', kind: 'money', align: 'right' },
    { key: 'change', label: 'Change', align: 'right', render: (r) => <Change value={r.change} /> },
    { key: 'marketCap', label: 'Mkt cap', kind: 'bigmoney', align: 'right' },
    { key: 'pe', label: 'P/E', kind: 'ratio', align: 'right' },
    { key: 'roe', label: 'ROE', kind: 'pct', align: 'right' },
    { key: 'grossMargin', label: 'Gross margin', kind: 'pct', align: 'right' },
    { key: 'salesYoY', label: 'Sales Y/Y', align: 'right', render: (r) => <Change value={r.salesYoY} arrow={false} /> },
    ...extraCols.map((k) => ({ key: k, label: FIELD_MAP[k].label, kind: FIELD_MAP[k].kind === 'pctSigned' ? 'pct' : FIELD_MAP[k].kind, align: 'right' })),
  ]
  return (
    <div className="space-y-8">
      <SectionHeader title="Screener" subtitle="Filter every stock by any metric. Results update instantly." action={<div className="flex gap-2"><ShareButton label="Share screen" /><button type="button" className="btn btn-secondary" onClick={saveScreen} disabled={!filters.length && !sector && !industry}>Save screen</button></div>} />

      <Card>
        <div className="mb-3 label">Presets</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => <button key={p.id} type="button" title={p.description} onClick={() => update({ f: filtersToParam(p.filters) })} className={`chip ${filtersToParam(p.filters) === filtersToParam(filters) ? 'chip-active' : ''}`}>{p.name}</button>)}
          {saved.map((s) => (
            <span key={s.name} className="chip gap-1 pr-2">
              <button type="button" onClick={() => update({ f: s.f, sector: s.sector, industry: s.industry })}>{s.name}</button>
              <button type="button" aria-label={`Delete ${s.name}`} onClick={() => savedStore.set((x) => x.filter((y) => y.name !== s.name))} className="rounded-full p-1 text-muted hover:text-down"><Trash size={16} /></button>
            </span>
          ))}
        </div>
        <div className="mt-5 label">Active filters</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {sector && <span className="chip chip-active">{sector}<button type="button" aria-label="Remove sector filter" onClick={() => update({ sector: '' })}><Close size={18} /></button></span>}
          {industry && <span className="chip chip-active">{industry}<button type="button" aria-label="Remove industry filter" onClick={() => update({ industry: '' })}><Close size={18} /></button></span>}
          {filters.map((f) => <span key={f.key} className="chip chip-active">{describe(f)}<button type="button" aria-label={`Remove ${FIELD_MAP[f.key].label} filter`} onClick={() => setFilters(filters.filter((x) => x.key !== f.key))}><Close size={18} /></button></span>)}
          {!adding && <button type="button" className="chip border-dashed" onClick={() => setAdding(true)}><Plus size={18} /> Add filter</button>}
          {(filters.length || sector || industry) ? <button type="button" className="btn btn-ghost min-h-10 text-sm" onClick={() => update({ f: '', sector: '', industry: '' })}>Clear all</button> : null}
        </div>
        {adding && (
          <div className="mt-4 grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
            <label className="block"><span className="label">Metric</span><select className="input mt-1" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })}>{NUMERIC_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label>
            <label className="block"><span className="label">Condition</span><select className="input mt-1" value={draft.op} onChange={(e) => setDraft({ ...draft, op: e.target.value })}>{OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            <label className="block"><span className="label">{draft.op === 'between' ? 'From' : 'Value'}{['bigmoney', 'big'].includes(FIELD_MAP[draft.key].kind) ? ' (billions)' : FIELD_MAP[draft.key].kind.startsWith('pct') ? ' (%)' : ''}</span><input className="input mt-1 w-32" type="number" step="any" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addFilter()} /></label>
            {draft.op === 'between' && <label className="block"><span className="label">To</span><input className="input mt-1 w-32" type="number" step="any" value={draft.value2} onChange={(e) => setDraft({ ...draft, value2: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addFilter()} /></label>}
            <div className="flex gap-2"><button type="button" className="btn btn-primary" onClick={addFilter}>Apply</button><button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button></div>
          </div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block"><span className="label">Sector</span><select className="input mt-1" value={sector} onChange={(e) => update({ sector: e.target.value })}><option value="">All sectors</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="block"><span className="label">Industry</span><select className="input mt-1" value={industry} onChange={(e) => update({ industry: e.target.value })}><option value="">All industries</option>{INDUSTRIES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="block"><span className="label">Find in results</span><input className="input mt-1" placeholder="Ticker or name" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        </div>
      </Card>

      <section>
        <div className="mb-2 flex items-center gap-2 text-muted"><Sliders size={18} />{loading ? `Loading… ${rows.length} stocks so far` : `${results.length} of ${rows.length} stocks match`}</div>
        {loading && rows.length === 0 ? <Card><div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}</div></Card>
          : results.length === 0 ? <EmptyState title="No stocks match these filters">Loosen a threshold or remove a filter to see results.</EmptyState>
          : <Card className="p-2 sm:p-3"><DataTable rows={results} columns={columns} defaultSort={{ key: sortKey, dir: 'desc' }} filename="bluechip-screener" onRowClick={(r) => navigate(`/stock/${r.symbol}`)} /></Card>}
      </section>
    </div>
  )
}
