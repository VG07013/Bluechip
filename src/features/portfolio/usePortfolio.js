/** Portfolio holdings: { id, symbol, shares, costBasis (per share), addedAt }. */
import { createPersistedStore } from '../../lib/store'

const store = createPersistedStore('portfolio', [])
export function usePortfolio() {
  const holdings = store.use()
  const add = (symbol, shares, costBasis) => store.set((s) => [...s, { id: Date.now().toString(36), symbol: symbol.toUpperCase(), shares: Number(shares), costBasis: Number(costBasis), addedAt: new Date().toISOString() }])
  const update = (id, patch) => store.set((s) => s.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  const remove = (id) => store.set((s) => s.filter((h) => h.id !== id))
  return { holdings, add, update, remove }
}
