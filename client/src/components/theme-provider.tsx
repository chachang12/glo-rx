import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'dark' | 'light'

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const STORAGE_KEY = 'axeous-theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

const readInitialTheme = (): Theme => {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'light' || attr === 'dark') return attr
  }
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'dark'
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme())

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), [])

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}

/** Small presentational button that toggles dark/light. Matches the landing. */
export const ThemeToggle = ({ className = 'theme-toggle' }: { className?: string }) => {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
