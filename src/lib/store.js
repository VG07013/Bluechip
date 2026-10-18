import { useSyncExternalStore } from 'react'
import { load, save } from './storage'

/** A tiny persisted store shared across components (useSyncExternalStore). */
export function createPersistedStore(key, initial) {
  let state = load(key, initial)
  const listeners = new Set()
  const get = () => state
  const set = (next) => {
    state = typeof next === 'function' ? next(state) : next
    save(key, state)
    listeners.forEach((l) => l())
  }
  const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
  const use = () => useSyncExternalStore(subscribe, get, get)
  // keep tabs in sync
  if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === 'bluechip:' + key) { state = load(key, initial); listeners.forEach((l) => l()) } })
  return { get, set, subscribe, use }
}
