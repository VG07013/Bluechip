/** Recent searches / recently viewed stocks, plus "last visit" snapshot for the home strip. */
import { createPersistedStore } from '../../lib/store'

export const recentStore = createPersistedStore('recent', [])        // [{symbol, name, at}]
export const lastVisitStore = createPersistedStore('lastVisit', null) // { at, prices: {SYM: price} }
export const notesStore = createPersistedStore('notes', {})           // { SYM: 'text' }

export function pushRecent(symbol, name) {
  recentStore.set((s) => [{ symbol, name, at: Date.now() }, ...s.filter((r) => r.symbol !== symbol)].slice(0, 10))
}
