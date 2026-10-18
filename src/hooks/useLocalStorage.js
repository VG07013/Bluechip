import { useCallback, useEffect, useState } from 'react'
import { load, save } from '../lib/storage'

/** useState persisted to localStorage (namespaced). Syncs across tabs. */
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => load(key, initial))
  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'bluechip:' + key) setValue(load(key, initial)) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const set = useCallback((next) => {
    setValue((prev) => { const v = typeof next === 'function' ? next(prev) : next; save(key, v); return v })
  }, [key])
  return [value, set]
}
