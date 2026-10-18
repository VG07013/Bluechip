import { useEffect } from 'react'
import { useWatchlist, checkAlerts } from './useWatchlist'
import { getQuotes } from '../../data'
import { useToast } from '../../hooks/useToast'
import { fmtMoney } from '../../lib/format'

/** Checks watchlist price alerts about once a minute while the app is open. */
export function AlertWatcher() {
  const { items, markTriggered } = useWatchlist()
  const toast = useToast()
  const key = items.map((i) => i.symbol + ':' + (i.alerts || []).filter((a) => !a.triggeredAt).length).join(',')
  useEffect(() => {
    const pending = items.filter((i) => (i.alerts || []).some((a) => !a.triggeredAt))
    if (!pending.length) return
    let alive = true
    const run = () => getQuotes(pending.map((i) => i.symbol)).then((qs) => {
      if (!alive) return
      const by = Object.fromEntries(qs.map((q) => [q.symbol, q]))
      checkAlerts(pending, by).forEach(({ symbol, alert, price }) => { markTriggered(symbol, alert.id); toast(`${symbol} is ${alert.type} ${fmtMoney(alert.price)} (now ${fmtMoney(price)})`, { tone: 'success', duration: 6000 }) })
    }).catch(() => {})
    run()
    const t = setInterval(run, 60 * 1000)
    return () => { alive = false; clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}
