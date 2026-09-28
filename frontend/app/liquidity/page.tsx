'use client'
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Plus, Search } from 'lucide-react'
import { PoolTable, type PoolFilter } from '@/components/liquidity/PoolTable'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const FILTER_LABELS: Record<PoolFilter, string> = {
  all: 'All pools',
  mine: 'Your positions',
}

const LiquidityPage = () => {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput)
  const [filter, setFilter] = useState<PoolFilter>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Nutup dropdown filter pas klik di luar — pola sama kayak "Other Apps" dropdown di Navbar.tsx
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative min-h-screen w-full bg-transparent text-white flex flex-col items-center overflow-hidden font-sans select-none p-4 md:p-[2vw]">

      <div className="relative z-20 w-full max-w-[420px] md:max-w-none md:w-[68vw] md:min-w-[520px] flex items-center gap-2 md:gap-[0.6vw] mb-3 md:mb-[0.8vw] mt-[20vw] md:mt-[8vw]">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3.5 md:left-[1vw] w-4 h-4 md:w-[1.1vw] md:h-[1.1vw] text-gray-400 shrink-0 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search pools by token"
            className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-[0.9vw] py-2 md:py-[0.55vw] pl-9 md:pl-[2.6vw] pr-3 md:pr-[0.9vw] text-xs md:text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        <div className="relative shrink-0" ref={filterRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="flex items-center gap-1.5 md:gap-[0.4vw] card-light rounded-xl md:rounded-[0.9vw] py-2 md:py-[0.55vw] px-3 md:px-[0.9vw] text-xs md:text-sm font-semibold text-white transition-all active:scale-95"
          >
            <span>{FILTER_LABELS[filter]}</span>
            <ChevronDown className={`w-3.5 h-3.5 md:w-[0.9vw] md:h-[0.9vw] text-gray-400 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFilterOpen && (
            <div className="absolute top-full right-0 mt-2 w-44 bg-[#0b0e17] p-1.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] border border-blue-500/30 ring-1 ring-white/10 z-50 flex flex-col gap-1">
              {(Object.keys(FILTER_LABELS) as PoolFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFilter(key)
                    setIsFilterOpen(false)
                  }}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <span>{FILTER_LABELS[key]}</span>
                  {filter === key && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/liquidity/new"
          className="btn-color flex items-center gap-1.5 md:gap-[0.4vw] text-white font-semibold text-xs md:text-sm py-2 px-4 rounded-xl transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Liquidity
        </Link>
      </div>

      <PoolTable searchQuery={debouncedSearch} filter={filter} />

      <p className="relative z-10 text-gray-400 text-xs md:text-[1.1vw] w-full max-w-[360px] md:max-w-[32vw] text-center mt-6 md:mt-[2vw] mb-6 md:mb-[3vw] leading-relaxed tracking-tight font-normal drop-shadow-sm">
        Pool data is read directly from the contract on <span className="text-blue-400 font-medium">BNB testnet</span>.
      </p>

    </div>
  )
}

export default LiquidityPage
