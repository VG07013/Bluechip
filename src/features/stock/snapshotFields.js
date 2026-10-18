/**
 * The registry of every Finviz snapshot field. Drives:
 *  - the grouped sections on the stock page
 *  - metric search ("ROE", "AAPL gross margin")
 *  - compare mode rows (and which direction is "better")
 *  - screener filters
 *
 * kind: how to format (see lib/format.js fmtByKind)
 * better: 'high' | 'low' | null  (for compare highlighting)
 * aliases: extra search terms
 */
export const GROUPS = [
  { id: 'valuation', label: 'Valuation' },
  { id: 'growth', label: 'Growth & Profitability' },
  { id: 'balance', label: 'Balance Sheet' },
  { id: 'ownership', label: 'Ownership & Shares' },
  { id: 'performance', label: 'Performance & Technicals' },
  { id: 'analyst', label: 'Analyst & Other' },
]

export const FIELDS = [
  // ---- Valuation ----
  { key: 'marketCap', label: 'Market Cap', group: 'valuation', kind: 'bigmoney', better: null, aliases: ['mcap', 'capitalization', 'size'] },
  { key: 'pe', label: 'P/E', group: 'valuation', kind: 'ratio', better: 'low', aliases: ['price to earnings', 'pe ratio', 'multiple'] },
  { key: 'forwardPe', label: 'Forward P/E', group: 'valuation', kind: 'ratio', better: 'low', aliases: ['fwd pe', 'forward pe'] },
  { key: 'peg', label: 'PEG', group: 'valuation', kind: 'ratio', better: 'low', aliases: ['price earnings growth'] },
  { key: 'ps', label: 'P/S', group: 'valuation', kind: 'ratio', better: 'low', aliases: ['price to sales'] },
  { key: 'pb', label: 'P/B', group: 'valuation', kind: 'ratio', better: 'low', aliases: ['price to book'] },
  { key: 'pc', label: 'P/C', group: 'valuation', kind: 'ratio', better: 'low', aliases: ['price to cash'] },
  { key: 'pfcf', label: 'P/FCF', group: 'valuation', kind: 'ratio', better: 'low', aliases: ['price to free cash flow'] },
  { key: 'eps', label: 'EPS (ttm)', group: 'valuation', kind: 'money', better: 'high', aliases: ['earnings per share'] },
  { key: 'epsNextY', label: 'EPS next Y', group: 'valuation', kind: 'money', better: 'high', aliases: ['eps next year'] },
  { key: 'epsNextQ', label: 'EPS next Q', group: 'valuation', kind: 'money', better: 'high', aliases: ['eps next quarter'] },
  { key: 'epsThisY', label: 'EPS this Y', group: 'valuation', kind: 'pctSigned', better: 'high', aliases: ['eps this year growth'] },
  { key: 'epsNext5Y', label: 'EPS next 5Y', group: 'valuation', kind: 'pctSigned', better: 'high', aliases: ['eps growth next 5 years'] },
  { key: 'epsPast5Y', label: 'EPS past 5Y', group: 'valuation', kind: 'pctSigned', better: 'high', aliases: ['eps growth past 5 years'] },
  { key: 'bookPerShare', label: 'Book/sh', group: 'valuation', kind: 'money', better: 'high', aliases: ['book value per share'] },
  { key: 'cashPerShare', label: 'Cash/sh', group: 'valuation', kind: 'money', better: 'high', aliases: ['cash per share'] },
  { key: 'dividendEst', label: 'Dividend Est.', group: 'valuation', kind: 'money', better: 'high', aliases: ['dividend estimate', 'yield'] },
  { key: 'dividendTTM', label: 'Dividend TTM', group: 'valuation', kind: 'money', better: 'high', aliases: ['dividend', 'dividends'] },
  { key: 'dividendExDate', label: 'Dividend Ex-Date', group: 'valuation', kind: 'date', better: null, aliases: ['ex dividend date'] },
  { key: 'payout', label: 'Payout', group: 'valuation', kind: 'pct', better: null, aliases: ['payout ratio'] },
  // ---- Growth & Profitability ----
  { key: 'sales', label: 'Sales', group: 'growth', kind: 'bigmoney', better: 'high', aliases: ['revenue', 'top line'] },
  { key: 'income', label: 'Income', group: 'growth', kind: 'bigmoney', better: 'high', aliases: ['net income', 'profit', 'earnings'] },
  { key: 'salesYoY', label: 'Sales Y/Y TTM', group: 'growth', kind: 'pctSigned', better: 'high', aliases: ['sales growth', 'revenue growth', 'sales yoy'] },
  { key: 'salesQoQ', label: 'Sales Q/Q', group: 'growth', kind: 'pctSigned', better: 'high', aliases: ['sales quarter over quarter'] },
  { key: 'salesPast5Y', label: 'Sales past 5Y', group: 'growth', kind: 'pctSigned', better: 'high', aliases: ['sales growth 5 years'] },
  { key: 'epsYoY', label: 'EPS Y/Y TTM', group: 'growth', kind: 'pctSigned', better: 'high', aliases: ['eps growth', 'earnings growth'] },
  { key: 'earningsQoQ', label: 'Earnings Q/Q', group: 'growth', kind: 'pctSigned', better: 'high', aliases: ['earnings quarter over quarter'] },
  { key: 'roa', label: 'ROA', group: 'growth', kind: 'pct', better: 'high', aliases: ['return on assets'] },
  { key: 'roe', label: 'ROE', group: 'growth', kind: 'pct', better: 'high', aliases: ['return on equity'] },
  { key: 'roic', label: 'ROIC', group: 'growth', kind: 'pct', better: 'high', aliases: ['return on invested capital'] },
  { key: 'grossMargin', label: 'Gross Margin', group: 'growth', kind: 'pct', better: 'high', aliases: ['gm', 'gross profit margin'] },
  { key: 'operMargin', label: 'Oper. Margin', group: 'growth', kind: 'pct', better: 'high', aliases: ['operating margin'] },
  { key: 'profitMargin', label: 'Profit Margin', group: 'growth', kind: 'pct', better: 'high', aliases: ['net margin'] },
  // ---- Balance sheet ----
  { key: 'currentRatio', label: 'Current Ratio', group: 'balance', kind: 'ratio', better: 'high', aliases: ['liquidity'] },
  { key: 'quickRatio', label: 'Quick Ratio', group: 'balance', kind: 'ratio', better: 'high', aliases: ['acid test'] },
  { key: 'debtEq', label: 'Debt/Eq', group: 'balance', kind: 'ratio', better: 'low', aliases: ['debt to equity', 'leverage'] },
  { key: 'ltDebtEq', label: 'LT Debt/Eq', group: 'balance', kind: 'ratio', better: 'low', aliases: ['long term debt to equity'] },
  // ---- Ownership & shares ----
  { key: 'sharesOutstanding', label: 'Shs Outstand', group: 'ownership', kind: 'big', better: null, aliases: ['shares outstanding', 'share count'] },
  { key: 'sharesFloat', label: 'Shs Float', group: 'ownership', kind: 'big', better: null, aliases: ['float', 'shares float'] },
  { key: 'insiderOwn', label: 'Insider Own', group: 'ownership', kind: 'pct', better: 'high', aliases: ['insider ownership'] },
  { key: 'insiderTrans', label: 'Insider Trans', group: 'ownership', kind: 'pctSigned', better: 'high', aliases: ['insider transactions'] },
  { key: 'instOwn', label: 'Inst Own', group: 'ownership', kind: 'pct', better: null, aliases: ['institutional ownership'] },
  { key: 'instTrans', label: 'Inst Trans', group: 'ownership', kind: 'pctSigned', better: 'high', aliases: ['institutional transactions'] },
  { key: 'shortFloat', label: 'Short Float', group: 'ownership', kind: 'pct', better: 'low', aliases: ['short interest percent', 'short float'] },
  { key: 'shortRatio', label: 'Short Ratio', group: 'ownership', kind: 'ratio', better: 'low', aliases: ['days to cover'] },
  { key: 'shortInterest', label: 'Short Interest', group: 'ownership', kind: 'big', better: 'low', aliases: ['shares short'] },
  // ---- Performance & technicals ----
  { key: 'perfWeek', label: 'Perf Week', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['weekly performance', '1 week'] },
  { key: 'perfMonth', label: 'Perf Month', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['monthly performance', '1 month'] },
  { key: 'perfQuarter', label: 'Perf Quarter', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['3 month performance'] },
  { key: 'perfHalfY', label: 'Perf Half Y', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['6 month performance'] },
  { key: 'perfYear', label: 'Perf Year', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['1 year performance', 'annual return'] },
  { key: 'perfYTD', label: 'Perf YTD', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['year to date'] },
  { key: 'beta', label: 'Beta', group: 'performance', kind: 'ratio', better: null, aliases: ['volatility vs market'] },
  { key: 'atr', label: 'ATR', group: 'performance', kind: 'money', better: null, aliases: ['average true range'] },
  { key: 'volatilityWeek', label: 'Volatility (Week)', group: 'performance', kind: 'pct', better: null, aliases: ['weekly volatility'] },
  { key: 'volatilityMonth', label: 'Volatility (Month)', group: 'performance', kind: 'pct', better: null, aliases: ['monthly volatility'] },
  { key: 'rsi', label: 'RSI (14)', group: 'performance', kind: 'ratio', better: null, aliases: ['relative strength index'] },
  { key: 'sma20', label: 'SMA20', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['20 day moving average'] },
  { key: 'sma50', label: 'SMA50', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['50 day moving average'] },
  { key: 'sma200', label: 'SMA200', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['200 day moving average'] },
  { key: 'high52', label: '52W High', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['52 week high'] },
  { key: 'low52', label: '52W Low', group: 'performance', kind: 'pctSigned', better: null, aliases: ['52 week low'] },
  { key: 'range52', label: '52W Range', group: 'performance', kind: 'text', better: null, aliases: ['52 week range'] },
  { key: 'relVolume', label: 'Rel Volume', group: 'performance', kind: 'ratio', better: null, aliases: ['relative volume'] },
  { key: 'avgVolume', label: 'Avg Volume', group: 'performance', kind: 'big', better: null, aliases: ['average volume'] },
  { key: 'volume', label: 'Volume', group: 'performance', kind: 'big', better: null, aliases: ['vol'] },
  { key: 'prevClose', label: 'Prev Close', group: 'performance', kind: 'money', better: null, aliases: ['previous close'] },
  { key: 'price', label: 'Price', group: 'performance', kind: 'money', better: null, aliases: ['last', 'quote'] },
  { key: 'change', label: 'Change', group: 'performance', kind: 'pctSigned', better: 'high', aliases: ['day change', 'today'] },
  // ---- Analyst & other ----
  { key: 'recom', label: 'Recom', group: 'analyst', kind: 'ratio', better: 'low', aliases: ['recommendation', 'analyst rating', 'consensus'] },
  { key: 'targetPrice', label: 'Target Price', group: 'analyst', kind: 'money', better: 'high', aliases: ['price target'] },
  { key: 'earningsDate', label: 'Earnings', group: 'analyst', kind: 'text', better: null, aliases: ['earnings date', 'next earnings', 'report date'] },
  { key: 'employees', label: 'Employees', group: 'analyst', kind: 'int', better: null, aliases: ['headcount', 'staff'] },
  { key: 'index', label: 'Index', group: 'analyst', kind: 'text', better: null, aliases: ['index membership', 's&p 500 member'] },
  { key: 'optionShort', label: 'Option/Short', group: 'analyst', kind: 'text', better: null, aliases: ['optionable', 'shortable'] },
  { key: 'sector', label: 'Sector', group: 'analyst', kind: 'text', better: null, aliases: [] },
  { key: 'industry', label: 'Industry', group: 'analyst', kind: 'text', better: null, aliases: [] },
  { key: 'country', label: 'Country', group: 'analyst', kind: 'text', better: null, aliases: [] },
  { key: 'exchange', label: 'Exchange', group: 'analyst', kind: 'text', better: null, aliases: [] },
]

export const FIELD_MAP = Object.fromEntries(FIELDS.map((f) => [f.key, f]))
export const fieldsInGroup = (groupId) => FIELDS.filter((f) => f.group === groupId)
/** Numeric fields usable in the screener / compare. */
export const NUMERIC_FIELDS = FIELDS.filter((f) => !['text', 'date'].includes(f.kind))

/** Jumpable sections on the stock page (also searchable). */
export const SECTIONS = [
  { id: 'chart', label: 'Chart', aliases: ['price chart', 'candles'] },
  { id: 'health', label: 'Health Score', aliases: ['score', 'quality'] },
  { id: 'valuation', label: 'Valuation', aliases: ['value', 'multiples'] },
  { id: 'growth', label: 'Growth & Profitability', aliases: ['profitability', 'margins'] },
  { id: 'balance', label: 'Balance Sheet', aliases: ['debt', 'liquidity'] },
  { id: 'ownership', label: 'Ownership', aliases: ['shares', 'short interest', 'float'] },
  { id: 'performance', label: 'Performance & Technicals', aliases: ['technicals', 'momentum'] },
  { id: 'analyst', label: 'Analyst & Other', aliases: ['other'] },
  { id: 'financials', label: 'Financial Charts', aliases: ['financial statements', 'income statement', 'cash flow'] },
  { id: 'earnings', label: 'Earnings', aliases: ['earnings history', 'beats', 'misses', 'eps surprise'] },
  { id: 'ratings', label: 'Analyst Ratings', aliases: ['price targets', 'upgrades', 'downgrades'] },
  { id: 'insider', label: 'Insider Trading', aliases: ['insiders', 'institutional', 'executives buying'] },
  { id: 'sentiment', label: 'Sentiment', aliases: ['stocktwits', 'bullish', 'bearish', 'social'] },
  { id: 'news', label: 'News', aliases: ['headlines', 'articles'] },
  { id: 'peers', label: 'Peers', aliases: ['competitors', 'similar stocks'] },
  { id: 'about', label: 'About', aliases: ['description', 'company profile', 'what does'] },
  { id: 'notes', label: 'Notes', aliases: ['my notes', 'personal notes'] },
]
