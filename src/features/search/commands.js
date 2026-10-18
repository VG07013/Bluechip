/**
 * Simple natural-language commands understood by the search bar.
 * Each returns { title, subtitle, to } or null.
 */
const TICKER = /^[A-Z^.]{1,6}$/i

export function parseCommand(raw) {
  const q = raw.trim()
  const lower = q.toLowerCase()
  if (!q) return null

  // compare AAPL MSFT  |  AAPL vs MSFT  |  compare aapl, msft, googl
  let m = lower.match(/^(?:compare|cmp)\s+(.+)$/) || lower.match(/^(.+?)\s+(?:vs\.?|versus)\s+(.+)$/)
  if (m) {
    const syms = (m[2] ? `${m[1]} ${m[2]}` : m[1]).split(/[\s,]+/).filter((s) => TICKER.test(s)).map((s) => s.toUpperCase())
    if (syms.length >= 2) return { title: `Compare ${syms.join(' vs ')}`, subtitle: 'Side-by-side metrics and overlaid charts', to: `/compare?s=${syms.join(',')}` }
    if (syms.length === 1) return { title: `Compare ${syms[0]} with…`, subtitle: 'Add one more ticker to compare', to: `/compare?s=${syms[0]}` }
    return { title: 'Compare stocks', subtitle: 'Pick 2–4 tickers', to: '/compare' }
  }
  if (/^(top\s+)?gainers?$/.test(lower) || /^(best|biggest)\s+(gainers|movers)/.test(lower)) return { title: 'Top gainers', subtitle: 'Today’s biggest winners', to: '/#gainers' }
  if (/^(top\s+)?losers?$/.test(lower) || /^(worst|biggest)\s+losers/.test(lower)) return { title: 'Top losers', subtitle: 'Today’s biggest decliners', to: '/#losers' }
  if (/^(trending|hot|popular)/.test(lower)) return { title: 'Trending on StockTwits', subtitle: 'Most-discussed tickers right now', to: '/#trending' }
  if (/^screen(er)?/.test(lower)) return { title: 'Open the screener', subtitle: 'Filter every stock by any metric', to: '/screener' }
  if (/^heat\s?map/.test(lower)) return { title: 'Market heatmap', subtitle: 'Sectors sized by market cap, colored by performance', to: '/heatmap' }
  if (/^watch(list)?/.test(lower)) return { title: 'My watchlist', subtitle: 'Your tracked stocks and price alerts', to: '/watchlist' }
  if (/^portfolio|^holdings|^my stocks/.test(lower)) return { title: 'My portfolio', subtitle: 'Holdings, cost basis and daily P&L', to: '/portfolio' }
  if (/^(econ(omic)?\s*(calendar|events)|fed|cpi|jobs report|fomc)/.test(lower)) return { title: 'Economic calendar', subtitle: 'Fed meetings, CPI, jobs report and more', to: '/calendar?tab=economic' }
  if (/^(earnings?\s*(calendar|this week)?|calendar)$/.test(lower)) return { title: 'Earnings calendar', subtitle: 'Who reports this week and month', to: '/calendar' }
  if (/^news$|^headlines$|^market news/.test(lower)) return { title: 'Latest market news', subtitle: 'Headlines with StockTwits sentiment', to: '/#news' }
  if (/^(home|market|overview|dashboard)$/.test(lower)) return { title: 'Market overview', subtitle: 'Indexes, mood meter and trending', to: '/' }
  if (/^(help|shortcuts|keyboard)$/.test(lower)) return { title: 'Keyboard shortcuts', subtitle: '/ or ⌘K to search, arrows to move, Enter to open', to: '/#shortcuts' }
  return null
}

/** Quick suggestions for the empty state. */
export const SUGGESTIONS = [
  { label: 'AAPL', q: 'AAPL' }, { label: 'compare AAPL MSFT', q: 'compare AAPL MSFT' }, { label: 'top gainers', q: 'top gainers' },
  { label: 'NVDA gross margin', q: 'NVDA gross margin' }, { label: 'semiconductors', q: 'semiconductors' }, { label: 'screener', q: 'screener' },
]
