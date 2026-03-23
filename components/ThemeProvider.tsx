'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'stone' | 'terminal'
export type Mode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  mode: Mode
  resolvedMode: 'light' | 'dark'
  setTheme: (t: Theme) => void
  setMode: (m: Mode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'stone',
  mode: 'system',
  resolvedMode: 'light',
  setTheme: () => {},
  setMode: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveMode(mode: Mode): 'light' | 'dark' {
  return mode === 'system' ? getSystemMode() : mode
}

function applyToDOM(theme: Theme, resolved: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-mode', resolved)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('stone')
  const [mode, setModeState] = useState<Mode>('system')
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const storedTheme = (localStorage.getItem('ui-theme') as Theme | null) ?? 'stone'
    const storedMode = (localStorage.getItem('ui-mode') as Mode | null) ?? 'system'
    const resolved = resolveMode(storedMode)

    setThemeState(storedTheme)
    setModeState(storedMode)
    setResolvedMode(resolved)
    applyToDOM(storedTheme, resolved)

    // Track system preference changes when mode is 'system'
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const currentMode = (localStorage.getItem('ui-mode') as Mode | null) ?? 'system'
      if (currentMode === 'system') {
        const newResolved = mq.matches ? 'dark' : 'light'
        const currentTheme = (localStorage.getItem('ui-theme') as Theme | null) ?? 'stone'
        setResolvedMode(newResolved)
        applyToDOM(currentTheme, newResolved)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('ui-theme', t)
    applyToDOM(t, resolvedMode)
  }

  function setMode(m: Mode) {
    const resolved = resolveMode(m)
    setModeState(m)
    setResolvedMode(resolved)
    localStorage.setItem('ui-mode', m)
    applyToDOM(theme, resolved)
  }

  return (
    <ThemeContext.Provider value={{ theme, mode, resolvedMode, setTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
