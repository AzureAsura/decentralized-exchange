'use client'

import React, { createContext, useContext, useState } from 'react'
import { isAddress } from 'viem'
import type { Asset } from '@/lib/contracts'

interface ImportedTokens {
  importedTokens: Asset[]
  addToken: (asset: Asset) => void
}

const STORAGE_KEY = 'nirmala-imported-tokens'

const ImportedTokensContext = createContext<ImportedTokens | null>(null)

const loadFromStorage = (): Asset[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a): a is Asset =>
        a &&
        typeof a.symbol === 'string' &&
        typeof a.name === 'string' &&
        typeof a.address === 'string' &&
        isAddress(a.address)
    )
  } catch {
    return []
  }
}

export function ImportedTokensProvider({ children }: { children: React.ReactNode }) {
  const [importedTokens, setImportedTokens] = useState<Asset[]>(loadFromStorage)

  const addToken = (asset: Asset) => {
    setImportedTokens((prev) => {
      const next = [...prev, asset]
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {

      }
      return next
    })
  }

  return (
    <ImportedTokensContext.Provider value={{ importedTokens, addToken }}>{children}</ImportedTokensContext.Provider>
  )
}

export function useImportedTokens() {
  const ctx = useContext(ImportedTokensContext)
  if (!ctx) throw new Error('useImportedTokens must be used within ImportedTokensProvider')
  return ctx
}
