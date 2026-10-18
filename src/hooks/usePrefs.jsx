import { createContext, useContext, useEffect, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'

/** Theme (light/dark/system) and text size (normal/large/xl) preferences. */
const PrefsCtx = createContext(null)
export function PrefsProvider({ children }) {
  const [theme, setTheme] = useLocalStorage('theme', 'system')
  const [textSize, setTextSize] = useLocalStorage('textSize', 'normal')
  useEffect(() => {
    const el = document.documentElement
    if (theme === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', theme)
  }, [theme])
  useEffect(() => { document.documentElement.setAttribute('data-text-size', textSize) }, [textSize])
  const value = useMemo(() => ({ theme, setTheme, textSize, setTextSize }), [theme, setTheme, textSize, setTextSize])
  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>
}
export const usePrefs = () => useContext(PrefsCtx)
