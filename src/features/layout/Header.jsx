import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { SearchBox } from '../search/SearchBox'
import { usePrefs } from '../../hooks/usePrefs'
import { getStatus, subscribe } from '../../data/status'
import { Sun, Moon, TextSize, Menu, Close, Home, Sliders, Grid, Columns, Star, Briefcase, Calendar } from '../../components/Icons'

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/screener', label: 'Screener', icon: Sliders },
  { to: '/heatmap', label: 'Heatmap', icon: Grid },
  { to: '/compare', label: 'Compare', icon: Columns },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/calendar', label: 'Calendars', icon: Calendar },
]

/** Sticky header: brand, pinned search, nav, theme + text size toggles. */
export function Header() {
  const { theme, setTheme, textSize, setTextSize } = usePrefs()
  const [menu, setMenu] = useState(false)
  const [status, setStatus] = useState(getStatus())
  const loc = useLocation()
  useEffect(() => subscribe(setStatus), [])
  useEffect(() => { setMenu(false) }, [loc.pathname])
  const isHome = loc.pathname === '/'
  const cycleTheme = () => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  const cycleText = () => setTextSize(textSize === 'normal' ? 'large' : textSize === 'large' ? 'xl' : 'normal')
  const textLabel = { normal: 'Normal', large: 'Large', xl: 'Extra Large' }[textSize]
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-text">Skip to content</a>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-2xl font-extrabold tracking-tight" aria-label="Bluechip home">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-text"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 4 9-9" /></svg></span>
          <span className="hidden sm:inline">Bluechip</span>
        </Link>
        {!isHome && <div className="min-w-0 max-w-2xl flex-1"><SearchBox variant="header" /></div>}
        {isHome && <div className="flex-1" />}
        <nav className="hidden items-center gap-0.5 2xl:flex" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `rounded-xl px-3 py-2 text-base font-semibold transition-colors ${isActive ? 'bg-accent-soft text-accent' : 'text-text-2 hover:bg-surface-2 hover:text-text'}`}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          {!status.live && <span className="hidden rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent xl:inline" title="No API key configured — showing built-in sample data">Demo data</span>}
          {status.live && status.fallbackReason && <span className="hidden rounded-full bg-down-soft px-3 py-1 text-sm font-bold text-down xl:inline" title={status.fallbackReason}>Partial fallback</span>}
          <button type="button" onClick={cycleText} className="btn btn-ghost min-h-11 px-3" title={`Text size: ${textLabel} (click to change)`} aria-label={`Text size ${textLabel}`}><TextSize /><span className="hidden text-sm xl:inline">{textLabel}</span></button>
          <button type="button" onClick={cycleTheme} className="btn btn-ghost min-h-11 px-3" title={`Theme: ${theme}`} aria-label={`Theme ${theme}`}>{dark ? <Moon /> : <Sun />}</button>
          <button type="button" onClick={() => setMenu((m) => !m)} className="btn btn-ghost min-h-11 px-3 2xl:hidden" aria-label="Menu" aria-expanded={menu}>{menu ? <Close /> : <Menu />}</button>
        </div>
      </div>
      {menu && (
        <nav className="border-t border-border bg-surface px-4 py-3 2xl:hidden fade-in" aria-label="Mobile">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold ${isActive ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-text-2'}`}><n.icon size={20} />{n.label}</NavLink>
            ))}
          </div>
          {!status.live && <p className="mt-3 text-sm text-muted">Showing built-in demo data. Add an API key in <code>src/config/api.js</code> for live quotes.</p>}
        </nav>
      )}
    </header>
  )
}
