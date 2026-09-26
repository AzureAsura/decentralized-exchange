'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface Settings {
  slippageBps: number
  deadlineMinutes: number
  setSlippageBps: (bps: number) => void
  setDeadlineMinutes: (minutes: number) => void
}

const DEFAULT_SLIPPAGE_BPS = 50 // 0.5%
const DEFAULT_DEADLINE_MINUTES = 20
const STORAGE_KEY = 'nirmala-settings'

const SettingsContext = createContext<Settings | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS)
  const [deadlineMinutes, setDeadlineMinutes] = useState(DEFAULT_DEADLINE_MINUTES)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed.slippageBps === 'number') setSlippageBps(parsed.slippageBps)
        if (typeof parsed.deadlineMinutes === 'number') setDeadlineMinutes(parsed.deadlineMinutes)
      }
    } catch {
      // localStorage nggak tersedia/rusak — pakai default, bukan blocking error
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ slippageBps, deadlineMinutes }))
    } catch {
      // ignore — preferensi lokal doang, bukan data kritis
    }
  }, [slippageBps, deadlineMinutes, hydrated])

  return (
    <SettingsContext.Provider value={{ slippageBps, setSlippageBps, deadlineMinutes, setDeadlineMinutes }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
