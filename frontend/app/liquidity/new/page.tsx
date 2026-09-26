'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AddLiquidityForm } from '@/components/liquidity/AddLiquidityForm'

const NewPoolPage = () => {
  return (
    <div className="relative min-h-screen w-full bg-transparent text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none p-4 md:p-[2vw]">

      {/* BACK LINK */}
      <div className="relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] mt-2 md:mt-0 mb-4 md:mb-[1vw]">
        <Link
          href="/liquidity"
          className="inline-flex items-center gap-1.5 md:gap-[0.4vw] text-gray-400 hover:text-white text-sm md:text-[0.95vw] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 md:w-[1vw] md:h-[1vw]" />
          All pools
        </Link>
      </div>

      <h1 className="text-2xl md:text-[2.2vw] font-[550] tracking-[-0.02em] text-[#E0E0E0] mb-6 md:mb-[1.5vw] z-10 text-center">
        Add Liquidity
      </h1>

      <Suspense fallback={null}>
        <AddLiquidityForm />
      </Suspense>

    </div>
  )
}

export default NewPoolPage
