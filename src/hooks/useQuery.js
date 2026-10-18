import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useQuery(key, fetcher, deps) — minimal async-data hook.
 * Returns { data, loading, error, refetch }. Ignores results from stale requests.
 */
export function useQuery(key, fetcher, { enabled = true } = {}) {
  const [state, setState] = useState({ data: undefined, loading: enabled, error: null })
  const seq = useRef(0)
  const run = useCallback(() => {
    if (!enabled) return
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.resolve()
      .then(fetcher)
      .then((data) => { if (id === seq.current) setState({ data, loading: false, error: null }) })
      .catch((error) => { if (id === seq.current) setState({ data: undefined, loading: false, error }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])
  useEffect(() => { run() }, [run])
  return { ...state, refetch: run }
}
