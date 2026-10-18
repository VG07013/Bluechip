/**
 * Watchlist store: symbols + price alerts. Persisted in localStorage.
 * alerts: { id, type: 'above' | 'below', price, triggeredAt: ISO|null }
 */
import { createPersistedStore } from '../../lib/store'

const store = createPersistedStore('watchlist', [])
export const watchlistStore = store

export function useWatchlist() {
  const items = store.use()
  const has = (symbol) => items.some((i) => i.symbol === symbol)
  const add = (symbol) => { if (!has(symbol)) store.set((s) => [...s, { symbol, addedAt: new Date().toISOString(), alerts: [] }]) }
  const remove = (symbol) => store.set((s) => s.filter((i) => i.symbol !== symbol))
  const toggle = (symbol) => (has(symbol) ? remove(symbol) : add(symbol))
  const addAlert = (symbol, type, price) => {
    if (!has(symbol)) add(symbol)
    store.set((s) => s.map((i) => (i.symbol === symbol ? { ...i, alerts: [...(i.alerts || []), { id: Date.now().toString(36), type, price: Number(price), triggeredAt: null }] } : i)))
  }
  const removeAlert = (symbol, id) => store.set((s) => s.map((i) => (i.symbol === symbol ? { ...i, alerts: (i.alerts || []).filter((a) => a.id !== id) } : i)))
  const markTriggered = (symbol, id) => store.set((s) => s.map((i) => (i.symbol === symbol ? { ...i, alerts: (i.alerts || []).map((a) => (a.id === id ? { ...a, triggeredAt: new Date().toISOString() } : a)) } : i)))
  return { items, symbols: items.map((i) => i.symbol), has, add, remove, toggle, addAlert, removeAlert, markTriggered }
}

/** Evaluate alerts against quotes. Returns the alerts that just fired. */
export function checkAlerts(items, quotesBySymbol) {
  const fired = []
  items.forEach((i) => {
    const q = quotesBySymbol[i.symbol]
    if (!q) return
    ;(i.alerts || []).forEach((a) => {
      if (a.triggeredAt) return
      if ((a.type === 'above' && q.price >= a.price) || (a.type === 'below' && q.price <= a.price)) fired.push({ symbol: i.symbol, alert: a, price: q.price })
    })
  })
  return fired
}
