import { useEffect } from 'react'
import { focusBestSearchBox } from '../search/searchRegistry'

/** Global shortcuts: "/" and Cmd/Ctrl+K open search from anywhere. */
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase()
      const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); focusBestSearchBox() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
