import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, AreaSeries, CandlestickSeries, HistogramSeries, LineSeries, ColorType, CrosshairMode } from 'lightweight-charts'
import { useQuery } from '../../hooks/useQuery'
import { getChartBars } from '../../data'
import { sma, rsi } from '../../lib/indicators'
import { Segmented, Skeleton, Change, ErrorMessage } from '../../components/ui'
import { fmtMoney, fmtBig, fmtDate, fmtTime } from '../../lib/format'

export const RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'Max']
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/**
 * Main interactive chart (TradingView Lightweight Charts).
 * Ranges, line/candle toggle, SMA 20/50/200, volume and RSI overlays, crosshair tooltip.
 * Line color follows the selected period's performance (green up / red down).
 */
export function PriceChart({ symbol, onRangeChange, height = 420 }) {
  const [range, setRange] = useState('1Y')
  const [mode, setMode] = useState('line')
  const [overlays, setOverlays] = useState({ sma20: false, sma50: true, sma200: true, volume: true, rsi: false })
  const [tip, setTip] = useState(null)
  const wrap = useRef(null)
  const chartRef = useRef(null)
  const { data, loading, error } = useQuery(`chart:${symbol}:${range}`, () => getChartBars(symbol, range))
  const bars = data?.bars || []
  const intraday = !!data?.intraday
  const perfPct = useMemo(() => (bars.length > 1 ? ((bars.at(-1).close - bars[0].close) / bars[0].close) * 100 : null), [bars])
  useEffect(() => { onRangeChange?.(range, perfPct) }, [range, perfPct, onRangeChange])

  // theme change should re-render chart colors
  const [themeTick, setThemeTick] = useState(0)
  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick((t) => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)'); const fn = () => setThemeTick((t) => t + 1)
    mq.addEventListener?.('change', fn)
    return () => { obs.disconnect(); mq.removeEventListener?.('change', fn) }
  }, [])

  useEffect(() => {
    if (!wrap.current || !bars.length) return
    const up = perfPct == null || perfPct >= 0
    const color = up ? css('--up') : css('--down')
    const text = css('--muted'), border = css('--border'), accent = css('--accent')
    const chart = createChart(wrap.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: text, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, attributionLogo: false },
      grid: { vertLines: { color: 'transparent' }, horzLines: { color: border } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: overlays.volume ? 0.22 : 0.08 } },
      timeScale: { borderVisible: false, timeVisible: intraday, secondsVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: CrosshairMode.Magnet, vertLine: { color: accent, labelBackgroundColor: accent, width: 1, style: 3 }, horzLine: { color: accent, labelBackgroundColor: accent } },
      handleScroll: { pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    })
    chartRef.current = chart
    const toTime = (b) => b.time
    let main
    if (mode === 'candle') {
      main = chart.addSeries(CandlestickSeries, { upColor: css('--up'), downColor: css('--down'), wickUpColor: css('--up'), wickDownColor: css('--down'), borderVisible: false })
      main.setData(bars.map((b) => ({ time: toTime(b), open: b.open, high: b.high, low: b.low, close: b.close })))
    } else {
      main = chart.addSeries(AreaSeries, { lineColor: color, topColor: color + '55', bottomColor: color + '05', lineWidth: 2.5, priceLineVisible: true, crosshairMarkerRadius: 6 })
      main.setData(bars.map((b) => ({ time: toTime(b), value: b.close })))
    }
    const closes = bars.map((b) => b.close)
    const smaSeries = []
    const addSma = (p, c) => {
      const s = chart.addSeries(LineSeries, { color: c, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
      const vals = sma(closes, p)
      s.setData(bars.map((b, i) => (vals[i] != null ? { time: toTime(b), value: vals[i] } : null)).filter(Boolean))
      smaSeries.push(s)
    }
    if (overlays.sma20 && !intraday) addSma(20, css('--accent'))
    if (overlays.sma50 && !intraday) addSma(50, css('--accent-hover'))
    if (overlays.sma200 && !intraday) addSma(200, css('--muted'))
    if (overlays.volume) {
      const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false })
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false })
      vol.setData(bars.map((b, i) => ({ time: toTime(b), value: b.volume, color: (i > 0 ? b.close >= bars[i - 1].close : true) ? css('--up') + '66' : css('--down') + '66' })))
    }
    if (overlays.rsi && !intraday && bars.length > 15) {
      const r = chart.addSeries(LineSeries, { color: accent, lineWidth: 2, priceLineVisible: false, lastValueVisible: true }, 1)
      const vals = rsi(closes, 14)
      r.setData(bars.map((b, i) => (vals[i] != null ? { time: toTime(b), value: vals[i] } : null)).filter(Boolean))
      r.createPriceLine({ price: 70, color: css('--down'), lineWidth: 1, lineStyle: 2, axisLabelVisible: false })
      r.createPriceLine({ price: 30, color: css('--up'), lineWidth: 1, lineStyle: 2, axisLabelVisible: false })
      const panes = chart.panes(); if (panes[1]) panes[1].setHeight(110)
    }
    chart.timeScale().fitContent()
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point || param.point.x < 0) { setTip(null); return }
      const idx = bars.findIndex((b) => b.time === param.time || (typeof param.time === 'object' && b.time === `${param.time.year}-${String(param.time.month).padStart(2, '0')}-${String(param.time.day).padStart(2, '0')}`))
      const b = bars[idx]
      if (!b) { setTip(null); return }
      const prev = bars[idx - 1]
      setTip({ x: param.point.x, bar: b, change: prev ? ((b.close - prev.close) / prev.close) * 100 : null })
    })
    return () => { chart.remove(); chartRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, mode, overlays, intraday, perfPct, themeTick])

  const toggle = (k) => setOverlays((o) => ({ ...o, [k]: !o[k] }))
  const fmtT = (t) => (typeof t === 'number' ? fmtTime(t * 1000) : fmtDate(t))
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented options={RANGES} value={range} onChange={setRange} ariaLabel="Chart range" />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented size="sm" options={[{ value: 'line', label: 'Line' }, { value: 'candle', label: 'Candles' }]} value={mode} onChange={setMode} ariaLabel="Chart type" />
          {[['sma20', 'SMA 20'], ['sma50', 'SMA 50'], ['sma200', 'SMA 200'], ['volume', 'Volume'], ['rsi', 'RSI']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={overlays[k]} onClick={() => toggle(k)} disabled={intraday && k !== 'volume'} className={`chip min-h-9 px-3 text-sm ${overlays[k] ? 'chip-active' : ''} disabled:opacity-40`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="relative">
        {perfPct != null && <div className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded-xl bg-surface/80 px-3 py-1 text-sm font-bold backdrop-blur"><span className="text-muted">{range}</span><Change value={perfPct} /></div>}
        {loading && <Skeleton className="w-full" style={{ height }} />}
        {error && <ErrorMessage error={error} title="Chart unavailable" />}
        {!loading && !error && bars.length === 0 && <div className="flex items-center justify-center text-muted" style={{ height }}>No price data for this range.</div>}
        <div ref={wrap} style={{ height: loading || !bars.length ? 0 : height + (overlays.rsi ? 110 : 0) }} className="w-full" />
        {tip && (
          <div className="pointer-events-none absolute top-12 z-10 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-card-lg" style={{ left: Math.min(Math.max(tip.x - 90, 0), (wrap.current?.clientWidth || 300) - 190) }}>
            <div className="font-bold">{fmtT(tip.bar.time)}</div>
            <div className="num grid grid-cols-2 gap-x-3"><span className="text-muted">Open</span><span>{fmtMoney(tip.bar.open)}</span><span className="text-muted">High</span><span>{fmtMoney(tip.bar.high)}</span><span className="text-muted">Low</span><span>{fmtMoney(tip.bar.low)}</span><span className="text-muted">Close</span><span className="font-bold">{fmtMoney(tip.bar.close)}</span><span className="text-muted">Volume</span><span>{fmtBig(tip.bar.volume, 1)}</span></div>
            {tip.change != null && <Change value={tip.change} className="mt-1" />}
          </div>
        )}
      </div>
    </div>
  )
}
