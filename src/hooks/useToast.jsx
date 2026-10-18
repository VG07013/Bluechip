import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastCtx = createContext(() => {})

/** Small bottom-center toasts ("Copied", alerts, errors). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const toast = useCallback((message, { tone = 'default', duration = 1800 } = {}) => {
    const id = ++idRef.current
    setToasts((t) => [...t.slice(-3), { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration)
  }, [])
  const value = useMemo(() => toast, [toast])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} style={{ animation: 'toastIn .25s ease' }}
            className={`pointer-events-auto rounded-2xl px-5 py-3 text-base font-semibold shadow-card-lg border ${t.tone === 'error' ? 'bg-down-soft text-down border-down/30' : t.tone === 'success' ? 'bg-up-soft text-up border-up/30' : 'bg-surface text-text border-border'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)
