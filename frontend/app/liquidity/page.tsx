'use client'
import React from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PoolTable } from '@/components/liquidity/PoolTable'

const LiquidityPage = () => {
  return (
    <div className="relative min-h-screen w-full bg-transparent text-white flex flex-col items-center overflow-hidden font-sans select-none p-4 md:p-[2vw]">

      {/* JUDUL UTAMA */}
      <h1 className="text-3xl md:text-[4.2vw] font-[550] tracking-[-0.03em] text-[#E0E0E0] mb-6 md:mb-[2vw] z-10 text-center drop-shadow-md mt-6 md:mt-[3vw]">
        Provide liquidity, earn fees.
      </h1>

      {/* CREATE POOL LINK */}
      <div className="relative z-10 w-full max-w-[420px] md:max-w-none md:w-[48vw] md:min-w-[520px] flex justify-end mb-3 md:mb-[0.8vw]">
        <Link
          href="/liquidity/new"
          className="btn-color flex items-center gap-1.5 md:gap-[0.4vw] text-white font-semibold text-xs md:text-sm py-2 px-4 rounded-xl transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Liquidity
        </Link>
      </div>

      <PoolTable />

      {/* FOOTER TEXT */}
      <p className="relative z-10 text-gray-400 text-xs md:text-[1.1vw] w-full max-w-[360px] md:max-w-[32vw] text-center mt-6 md:mt-[2vw] mb-6 md:mb-[3vw] leading-relaxed tracking-tight font-normal drop-shadow-sm">
        Pool data is read directly from the contract on <span className="text-blue-400 font-medium">BNB testnet</span>.
      </p>

    </div>
  )
}

export default LiquidityPage
