# Bluechip

Clean, ad-free stock research. Every Finviz snapshot field, redesigned with a big, readable, Robinhood-style layout in a blueish-platinum palette.

- **Homescreen** — universal search, market strip (S&P 500, Nasdaq, Dow, Russell, VIX) with a mood meter, StockTwits trending, news with sentiment labels, gainers/losers, "since your last visit", this week's earnings and economic events.
- **Stock page** — plain-English summary, large interactive chart (1D–Max, line/candles, SMA 20/50/200, volume, RSI, crosshair), hero tiles (ROE, gross margin, sales Y/Y, shares Y/Y with multi-year sparklines), health score, valuation context (P/E vs 5-year range and sector), every Finviz field in six groups, financial charts (annual/quarterly), earnings beats/misses, analyst ratings and targets, insider activity callout + table, StockTwits sentiment gauge + feed, news, peers, description, personal notes.
- **Screener** — filter by any metric with big chips, presets, saved screens, sortable table, shareable URLs.
- **Heatmap** — sectors sized by market cap, colored by performance over a selectable period.
- **Compare** — 2–4 stocks, every metric in rows with the better value highlighted, overlaid price charts.
- **Watchlist & portfolio** — price alerts, holdings with cost basis, total/daily P&L, daily summary.
- **Calendars** — earnings and economic events by week or month, filterable to your watchlist.
- **Everywhere** — click any value to copy it, export any table to CSV, shareable links, full keyboard navigation (`/` or `⌘K` to search), light/dark theme, three text sizes.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

With no API key the app runs entirely on built-in **demo data** (a deterministic sample of ~95 large caps, ETFs and indexes) so every screen works out of the box. A "Demo data" pill appears in the header.

## Connecting live data

All keys live in **one file**: [`src/config/api.js`](src/config/api.js) (or a `.env` file — see `.env.example`).

```bash
cp .env.example .env
# then set one of:
VITE_DATA_PROVIDER=fmp
VITE_FMP_KEY=your_key          # https://site.financialmodelingprep.com/developer/docs
# or
VITE_DATA_PROVIDER=polygon
VITE_POLYGON_KEY=your_key      # https://polygon.io
```

**Financial Modeling Prep is the recommended provider** — it covers prices, fundamentals, estimates, insiders, analysts, news and both calendars. Polygon covers prices, news and reference data well but is thin on fundamentals (see the coverage table).

Responses are cached in memory and `localStorage` with per-type TTLs (`cacheTtl` in the config) and requests go through a concurrency limiter, so a free FMP key (250 requests/day) is enough for browsing. The screener and heatmap need one snapshot per stock in the universe (~95 requests on first load, then cached for 12 hours), so on the free tier expect them to run on demo data after the quota is spent — the UI falls back automatically and shows a "Partial fallback" pill with the reason on hover.

### StockTwits

Trending and sentiment come from StockTwits' public API through a single module, [`src/data/stocktwits.js`](src/data/stocktwits.js). StockTwits does not send CORS headers, so the browser calls it through a proxy at `/api/stocktwits`:

- **Development:** Vite proxies it automatically (see `vite.config.js`).
- **Production:** add the same rewrite to your host, e.g. Netlify `_redirects`: `/api/stocktwits/* https://api.stocktwits.com/api/2/:splat 200`, or a Vercel `rewrites` entry.

If StockTwits is unreachable or rate-limited (~200 requests/hour), the module falls back to FMP's social-sentiment and most-active endpoints, and finally to demo data. In demo mode (no price provider) trending uses the demo list so that prices are never missing.

## What the APIs can't provide

These Finviz fields have no equivalent on FMP/Polygon and will show **n/a** in live mode (demo mode fills them with sample values so the layout is complete). Decide how you'd like to handle each:

| Finviz field | FMP | Polygon | Notes / options |
|---|---|---|---|
| Short Float, Short Ratio, Short Interest | ✗ | ✗ | Needs a short-interest feed (e.g. FINRA bi-monthly data, Ortex, or Nasdaq's short-interest API). |
| Insider Own %, Inst Own %, Insider Trans %, Inst Trans % | Premium only (`institutional-ownership/*`) | ✗ | Free tier returns 402. Could approximate Insider Trans from the insider-trades table (3-month net). |
| Option/Short ("Yes / Yes") | ✗ | ✗ | Finviz-specific flags; could be derived from Polygon's options contracts endpoint (optionable) — shortable has no public source. |
| Index membership | Via `sp500-constituent` lists | ✗ | Currently uses the built-in universe list; wire up the constituent endpoints if you want it for every ticker. |
| EPS next Q, EPS next Y, EPS next 5Y, EPS this Y | `analyst-estimates` (premium on some plans) | ✗ | 5-year forward EPS growth is not provided by either; Bluechip shows n/a rather than guessing. |
| LT Debt/Eq | Approximated from `longTermDebtToCapitalRatioTTM` / balance sheet | Partial | Exact Finviz definition unavailable. |
| Earnings date "BMO/AMC" | ✓ (`earnings`) | ✗ | |
| Dividend Est. | Uses trailing dividends | ✗ | No forward dividend estimate endpoint. |
| Sector average P/E | `sector-pe-snapshot` | ✗ | Falls back to built-in sector averages. |
| Analyst price-target *history* | `price-target-summary` (period averages only) | ✗ | Finviz-style per-analyst target history isn't available on the free tier. |
| Index quotes (S&P, Dow, VIX) | ✓ (`^GSPC` etc.) | ✗ (uses SPY/QQQ/DIA/IWM/VIXY proxies) | |
| Earnings & economic calendars | ✓ | ✗ | Polygon users get demo calendars. |
| Insider trades, analyst grades, peers, earnings history | ✓ | ✗ | Polygon users get demo data for these sections. |
| StockTwits message volume | ✗ (only via StockTwits proxy) | ✗ | Falls back to watcher count or FMP post counts. |
| Company logos | ✓ | ✓ (needs key in URL) | Demo mode shows lettermarks. |

Performance (week/month/…), ATR, volatility, RSI, SMA distances and 52-week ranges are computed client-side from price history (`src/lib/indicators.js`) with both providers.

## Project layout

```
src/
  config/api.js            keys, provider choice, cache TTLs  ← the one config file
  data/                    data layer
    index.js               unified facade used by every page (live → demo fallback)
    fmp.js, polygon.js     provider clients mapped to normalized shapes
    stocktwits.js          trending + sentiment with fallbacks
    demo.js                deterministic sample data
    universe.js            curated ticker universe (search index / screener / heatmap)
    status.js              "demo data" / "partial fallback" status
  lib/                     formatting, caching, fuzzy search, indicators, CSV, stores
  components/              shared UI (cards, tables, gauges, sparklines, bar charts, icons)
  features/
    layout/                header, footer, hotkeys, share button
    search/                universal search (index, commands, dropdown, recents)
    home/                  homescreen sections
    stock/                 stock page, chart, metric registry (snapshotFields.js), health, summary
    screener/ heatmap/ compare/ watchlist/ portfolio/ calendar/
```

To add a metric: add one entry to `FIELDS` in `src/features/stock/snapshotFields.js` and map it in `fmp.js` (and `demo.js`). It then appears on the stock page, in search, in compare and in the screener automatically.

## Keyboard

`/` or `⌘K` focus search · `↑ ↓` move · `Enter` open · `Esc` close · `Tab` through every control. Typing a ticker and pressing Enter with no match opens that ticker directly.

## Disclaimer

Scores, summaries and sentiment are automated and for information only. Nothing here is investment advice.
