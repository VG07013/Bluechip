import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSearch } from './useSearch'
import { registerSearchBox } from './searchRegistry'
import { SUGGESTIONS } from './commands'
import { pushRecent } from './recent'
import { highlight } from '../../lib/fuzzy'
import { fmtMoney, fmtByKind } from '../../lib/format'
import { Change, Logo, Skeleton } from '../../components/ui'
import { SearchIcon, Close, Sparkles, Trend, Grid, Columns, Clock, Star } from '../../components/Icons'
import { lookup } from '../../data'

/**
 * Universal search box. `variant="hero"` is the large centered home version;
 * `variant="header"` is the pinned one. Both share the same dropdown.
 */
export function SearchBox({ variant = 'header', autoFocus = false }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const listId = useId()
  const currentSymbol = useMemo(() => { const m = location.pathname.match(/^\/stock\/([^/]+)/); return m ? decodeURIComponent(m[1]).toUpperCase() : null }, [location.pathname])
  const { groups, flat, quotes } = useSearch(q, currentSymbol)

  useEffect(() => registerSearchBox(variant, variant === 'hero' ? 2 : 1, () => { inputRef.current?.focus(); inputRef.current?.select(); setOpen(true) }), [variant])
  useEffect(() => { if (autoFocus) inputRef.current?.focus() }, [autoFocus])
  useEffect(() => { setActive(0) }, [q, groups.length])
  useEffect(() => { setOpen(false) }, [location.pathname, location.search, location.hash])

  // keep active row visible
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (item) => {
    if (!item) return
    if (item.kind === 'stock') pushRecent(item.symbol, item.subtitle || lookup(item.symbol)?.name || '')
    if (item.kind === 'news' && item.url && item.url !== '#') { window.open(item.url, '_blank', 'noopener'); setOpen(false); return }
    setOpen(false); setQ('')
    inputRef.current?.blur()
    navigate(item.to)
  }

  const onKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); return }
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[active]) choose(flat[active])
      else if (q.trim()) { const s = q.trim().toUpperCase(); pushRecent(s, ''); setOpen(false); setQ(''); navigate(`/stock/${encodeURIComponent(s)}`) }
    }
  }

  const hero = variant === 'hero'
  let idx = -1
  return (
    <div className={`relative ${open ? 'z-40' : ''} ${hero ? 'mx-auto w-full max-w-3xl' : 'w-full'}`}>
      <div className={`relative flex items-center ${hero ? 'h-16 sm:h-20' : 'h-12 sm:h-13'}`}>
        <SearchIcon size={hero ? 28 : 22} className="pointer-events-none absolute left-5 text-muted" />
        <input
          ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={open && flat[active] ? `${listId}-${active}` : undefined}
          placeholder={hero ? 'Search stocks, metrics, sectors… try “AAPL ROE” or “compare AAPL MSFT”' : 'Search stocks, metrics, or commands'}
          className={`input h-full rounded-full border-border bg-surface pl-14 pr-12 md:pr-28 shadow-card ${hero ? 'text-xl sm:text-2xl' : 'text-base'}`}
          autoComplete="off" spellCheck="false" aria-label="Search"
        />
        <div className="absolute right-3 flex items-center gap-2">
          {q && <button type="button" aria-label="Clear" onClick={() => { setQ(''); inputRef.current?.focus() }} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text"><Close size={18} /></button>}
          <span className="hidden items-center gap-1 md:flex"><kbd className="kbd">/</kbd><kbd className="kbd">⌘K</kbd></span>
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onMouseDown={() => setOpen(false)} aria-hidden="true" />
          <div ref={listRef} id={listId} role="listbox" className="absolute left-0 right-0 z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-3xl border border-border bg-surface p-2 shadow-card-lg fade-in">
            {groups.length === 0 && (
              <div className="p-6">
                <div className="flex items-center gap-2 text-lg font-bold"><Sparkles size={22} className="text-accent" />{q ? `No matches for “${q}”` : 'Start typing to search'}</div>
                <p className="mt-1 text-muted">{q ? 'Try a ticker, a company name, a metric like “ROE”, or a command.' : 'Tickers, company names, metrics, sectors and commands all work here.'}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => <button key={s.q} type="button" className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(s.q); inputRef.current?.focus() }}>{s.label}</button>)}
                </div>
                {q && <button type="button" className="btn btn-primary mt-5" onMouseDown={(e) => e.preventDefault()} onClick={() => { const s = q.trim().toUpperCase(); setOpen(false); setQ(''); navigate(`/stock/${encodeURIComponent(s)}`) }}>Open “{q.trim().toUpperCase()}” anyway</button>}
              </div>
            )}
            {groups.map((g) => (
              <div key={g.id} className="mb-1">
                <div className="flex items-center gap-2 px-4 pb-1 pt-3 text-sm font-bold uppercase tracking-wide text-muted">
                  {g.id === 'recent' && <Clock size={16} />}{g.id === 'watchlist' && <Star size={16} />}{g.id === 'commands' && <Sparkles size={16} />}{g.label}
                </div>
                {g.items.map((item) => {
                  idx += 1
                  const i = idx
                  const isActive = i === active
                  return (
                    <div key={item.id} id={`${listId}-${i}`} data-idx={i} role="option" aria-selected={isActive}
                      onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(item)}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl px-4 py-3 transition-colors ${isActive ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}>
                      <ResultRow item={item} q={q} quote={quotes[item.symbol]} />
                    </div>
                  )
                })}
              </div>
            ))}
            {groups.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 text-sm text-muted">
                <span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> navigate</span><span><kbd className="kbd">Enter</kbd> open</span><span><kbd className="kbd">Esc</kbd> close</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Hl({ text, q }) { return highlight(text, q).map((p, i) => (p.hit ? <mark key={i} className="mark">{p.text}</mark> : <span key={i}>{p.text}</span>)) }

function ResultRow({ item, q, quote }) {
  if (item.kind === 'stock') {
    const meta = lookup(item.symbol)
    return (
      <>
        <Logo symbol={item.symbol} src={item.logo} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="text-lg font-bold"><Hl text={item.title} q={q} /></span>{item.exchange && <span className="rounded-md bg-surface-2 px-1.5 text-xs font-bold text-muted">{item.exchange}</span>}{item.type === 'etf' && <span className="rounded-md bg-accent-soft px-1.5 text-xs font-bold text-accent">ETF</span>}{item.type === 'index' && <span className="rounded-md bg-accent-soft px-1.5 text-xs font-bold text-accent">INDEX</span>}</div>
          <div className="truncate text-muted"><Hl text={item.subtitle} q={q} />{meta?.sector ? <span className="hidden sm:inline"> · {meta.sector}</span> : null}</div>
        </div>
        <div className="text-right">
          {quote ? <><div className="num text-lg font-bold">{fmtMoney(quote.price)}</div><Change value={quote.changePct} /></> : <><Skeleton className="mb-1 ml-auto h-5 w-20" /><Skeleton className="ml-auto h-4 w-14" /></>}
        </div>
      </>
    )
  }
  const icon = item.kind === 'command' ? <Sparkles size={22} /> : item.kind === 'metric' ? <Trend size={22} /> : item.kind === 'taxonomy' ? <Grid size={22} /> : item.kind === 'section' ? <Columns size={22} /> : <Clock size={22} />
  return (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-lg font-bold"><Hl text={item.title} q={q} /></div>
        <div className="truncate text-muted">{item.subtitle}</div>
      </div>
      {item.kind === 'metric' && item.value != null && <div className="num text-lg font-bold">{fmtByKind(item.value, item.field.kind)}</div>}
    </>
  )
}
