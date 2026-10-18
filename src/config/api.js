/**
 * Bluechip API configuration — the ONE place to put keys.
 *
 * Providers
 *  - 'fmp'      Financial Modeling Prep  (prices, fundamentals, news, calendars, insiders, analysts)
 *  - 'polygon'  Polygon.io               (prices, news, reference data; fundamentals are limited)
 *  - 'demo'     Built-in deterministic sample data. Used automatically when no key is set
 *               or when a live request fails, so the site always renders.
 *
 * You can set keys here or via Vite env vars (VITE_FMP_KEY, VITE_POLYGON_KEY) in a .env file.
 */
const env = import.meta.env || {}

export const API_CONFIG = {
  /** Primary data provider: 'fmp' | 'polygon' | 'demo' */
  provider: env.VITE_DATA_PROVIDER || (env.VITE_FMP_KEY ? 'fmp' : env.VITE_POLYGON_KEY ? 'polygon' : 'demo'),

  fmp: {
    key: env.VITE_FMP_KEY || '',
    base: 'https://financialmodelingprep.com/stable',
  },

  polygon: {
    key: env.VITE_POLYGON_KEY || '',
    base: 'https://api.polygon.io',
  },

  stocktwits: {
    /** Proxied path (see vite.config.js). Direct browser calls are blocked by CORS. */
    base: '/api/stocktwits',
    /** Fallback when StockTwits is unavailable: 'fmp' (social sentiment / most active) or 'demo' */
    fallback: 'fmp',
  },

  /** Cache lifetimes in milliseconds. Keep these generous to stay inside free-tier rate limits. */
  cacheTtl: {
    quote: 60 * 1000,           // 1 minute
    intraday: 5 * 60 * 1000,    // 5 minutes
    history: 6 * 60 * 60 * 1000, // 6 hours
    profile: 24 * 60 * 60 * 1000,
    fundamentals: 12 * 60 * 60 * 1000,
    news: 10 * 60 * 1000,
    trending: 5 * 60 * 1000,
    calendar: 60 * 60 * 1000,
    search: 24 * 60 * 60 * 1000,
    screener: 60 * 60 * 1000,
  },

  /** Max simultaneous outbound requests (protects free-tier limits). */
  maxConcurrency: 4,
}

export const hasLiveProvider = () =>
  (API_CONFIG.provider === 'fmp' && !!API_CONFIG.fmp.key) ||
  (API_CONFIG.provider === 'polygon' && !!API_CONFIG.polygon.key)
