import { Link } from 'react-router-dom'
export function Footer() {
  return (
    <footer className="mt-16 border-t border-border py-10 text-muted">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="text-lg font-bold text-text">Bluechip</div>
          <p className="max-w-xl text-sm">Clean, ad-free stock research. Data is for information only and is not investment advice. Scores and summaries are automated and may be wrong — always verify with primary sources.</p>
        </div>
        <div id="shortcuts" className="text-sm">
          <div className="mb-1 font-bold text-text">Keyboard</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1"><span><kbd className="kbd">/</kbd> or <kbd className="kbd">⌘K</kbd> search</span><span><kbd className="kbd">↑↓</kbd> move</span><span><kbd className="kbd">Enter</kbd> open</span><span><kbd className="kbd">Esc</kbd> close</span><span><kbd className="kbd">Tab</kbd> navigate</span></div>
          <div className="mt-2"><Link to="/" className="link">Home</Link> · <Link to="/screener" className="link">Screener</Link> · <Link to="/heatmap" className="link">Heatmap</Link> · <Link to="/compare" className="link">Compare</Link></div>
        </div>
      </div>
    </footer>
  )
}
