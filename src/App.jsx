import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, useLocation } from 'react-router-dom'

// VITE_ROUTER=hash builds a static-host friendly bundle (no server rewrites needed).
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter
import { Header } from './features/layout/Header'
import { Footer } from './features/layout/Footer'
import { useHotkeys } from './features/layout/useHotkeys'
import { ToastProvider } from './hooks/useToast'
import { PrefsProvider } from './hooks/usePrefs'
import { SkeletonCard } from './components/ui'
import { HomePage } from './features/home/HomePage'
import { StockPage } from './features/stock/StockPage'
import { AlertWatcher } from './features/watchlist/AlertWatcher'

// Secondary views are code-split to keep the first paint fast.
const ScreenerPage = lazy(() => import('./features/screener/ScreenerPage').then((m) => ({ default: m.ScreenerPage })))
const HeatmapPage = lazy(() => import('./features/heatmap/HeatmapPage').then((m) => ({ default: m.HeatmapPage })))
const ComparePage = lazy(() => import('./features/compare/ComparePage').then((m) => ({ default: m.ComparePage })))
const WatchlistPage = lazy(() => import('./features/watchlist/WatchlistPage').then((m) => ({ default: m.WatchlistPage })))
const PortfolioPage = lazy(() => import('./features/portfolio/PortfolioPage').then((m) => ({ default: m.PortfolioPage })))
const CalendarPage = lazy(() => import('./features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })))

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => { if (!hash) window.scrollTo({ top: 0 }) }, [pathname, hash])
  return null
}

function Shell() {
  useHotkeys()
  const loc = useLocation()
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <ScrollManager />
      <AlertWatcher />
      {/* key on pathname gives a subtle fade between pages */}
      <main id="main" key={loc.pathname} className="page-enter mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-6 sm:px-6">
        <Suspense fallback={<div className="grid gap-4"><SkeletonCard /><SkeletonCard /></div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/stock/:symbol" element={<StockPage />} />
            <Route path="/screener" element={<ScreenerPage />} />
            <Route path="/heatmap" element={<HeatmapPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <PrefsProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </PrefsProvider>
    </Router>
  )
}
