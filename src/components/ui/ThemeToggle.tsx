'use client'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('mp-theme')
    const dark = saved !== 'light'
    setIsDark(dark)
    document.documentElement.classList.toggle('light', !dark)
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('light', !next)
    localStorage.setItem('mp-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Byt till ljust läge' : 'Byt till mörkt läge'}
      className="relative w-8 h-8 flex items-center justify-center rounded-full text-mp-t1 hover:text-mp-t0 hover:bg-mp-s2 transition-colors"
    >
      {/* Moon – gold */}
      <svg
        viewBox="0 0 24 24"
        className="absolute w-4 h-4 transition-all duration-300"
        style={{ opacity: isDark ? 1 : 0, transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0)', color: '#f5c518' }}
        fill="currentColor" stroke="none"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      {/* Sun – yellow */}
      <svg
        viewBox="0 0 24 24"
        className="absolute w-5 h-5 transition-all duration-300"
        style={{ opacity: isDark ? 0 : 1, transform: isDark ? 'rotate(-90deg) scale(0)' : 'rotate(0deg) scale(1)', color: '#facc15' }}
        fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
        <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
      </svg>
    </button>
  )
}
