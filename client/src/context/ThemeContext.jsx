import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const THEME_STORAGE_KEY = 'todoflow-theme'

const ThemeContext = createContext({
  theme: 'system',
  effectiveTheme: 'light',
  setTheme: () => {},
})

/**
 * Resolves system preference: 'dark' or 'light'
 */
function getSystemPreference() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Retrieves the stored theme safely from localStorage.
 */
function getStoredTheme() {
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY)
    if (val === 'light' || val === 'dark' || val === 'system') return val
  } catch (e) {
    console.warn('Unable to access localStorage for theme:', e)
  }
  return 'system'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme)
  const [effectiveTheme, setEffectiveTheme] = useState(() => {
    const initial = getStoredTheme()
    return initial === 'system' ? getSystemPreference() : initial
  })

  // Apply the effective theme to <html> and handle transitions
  const applyThemeToDOM = useCallback((newEffective, withTransition = true) => {
    const root = document.documentElement
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (withTransition && !prefersReducedMotion) {
      root.classList.add('theme-transition')
      window.clearTimeout(window.__themeTransitionTimeout)
      window.__themeTransitionTimeout = window.setTimeout(() => {
        root.classList.remove('theme-transition')
      }, 200)
    }

    root.setAttribute('data-theme', newEffective)
    root.style.colorScheme = newEffective
  }, [])

  // Explicit user action to change theme
  const setTheme = useCallback((newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark' && newTheme !== 'system') return

    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    } catch (e) {
      console.warn('Unable to persist theme to localStorage:', e)
    }

    setThemeState(newTheme)
    const nextEffective = newTheme === 'system' ? getSystemPreference() : newTheme
    setEffectiveTheme(nextEffective)
    applyThemeToDOM(nextEffective, true)
  }, [applyThemeToDOM])

  // Watch for OS system preference changes live when theme is 'system'
  useEffect(() => {
    if (!window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = (e) => {
      if (theme === 'system') {
        const nextEffective = e.matches ? 'dark' : 'light'
        setEffectiveTheme(nextEffective)
        applyThemeToDOM(nextEffective, true)
      }
    }

    // Modern browsers support addEventListener, older use addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange)
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleSystemChange)
      }
    }
  }, [theme, applyThemeToDOM])

  // Ensure DOM is in sync on mount without transition
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemPreference() : theme
    setEffectiveTheme(resolved)
    applyThemeToDOM(resolved, false)
  }, [theme, applyThemeToDOM])

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
