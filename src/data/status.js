/**
 * Tiny observable describing where data is coming from, so the header can show a
 * "Demo data" pill and the UI can explain fallbacks in friendly language.
 */
import { API_CONFIG, hasLiveProvider } from '../config/api'

const state = {
  provider: API_CONFIG.provider,
  live: hasLiveProvider(),
  /** set when a live request failed and demo data was substituted */
  fallbackReason: null,
  lastError: null,
}
const listeners = new Set()
export function getStatus() { return { ...state } }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }
export function reportFallback(reason, err) {
  state.fallbackReason = reason
  state.lastError = err ? String(err.message || err) : null
  listeners.forEach((l) => l(getStatus()))
}
export function reportOk() {
  if (state.fallbackReason) { state.fallbackReason = null; listeners.forEach((l) => l(getStatus())) }
}
