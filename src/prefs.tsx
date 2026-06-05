import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface Prefs {
  darkMode: boolean
  techMode: boolean // true = web3 terms, false = plain Spanish
  toggleDark: () => void
  toggleTech: () => void
}

const PrefsContext = createContext<Prefs>({
  darkMode: false,
  techMode: false,
  toggleDark: () => {},
  toggleTech: () => {},
})

export function usePrefs() { return useContext(PrefsContext) }

// Plain Spanish → Web3 term map (used when techMode is ON)
const TERMS: Record<string, string> = {
  créditos: 'CRC',
  'cuenta digital': 'wallet',
  colecta: 'colecta', // stays the same
}

/** Returns the right word given current mode */
export function useTerm() {
  const { techMode } = usePrefs()
  return function t(plain: string): string {
    if (!techMode) return plain
    return TERMS[plain] ?? plain
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('coopera_dark')
    if (saved !== null) return saved === '1'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [techMode, setTechMode] = useState(
    () => localStorage.getItem('coopera_tech') === '1'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('coopera_dark', darkMode ? '1' : '0')
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('coopera_tech', techMode ? '1' : '0')
  }, [techMode])

  const toggleDark = () => setDarkMode(v => !v)
  const toggleTech = () => setTechMode(v => !v)

  return (
    <PrefsContext.Provider value={{ darkMode, techMode, toggleDark, toggleTech }}>
      {children}
    </PrefsContext.Provider>
  )
}
