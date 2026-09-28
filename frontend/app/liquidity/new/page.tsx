'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AddLiquidityForm } from '@/components/liquidity/AddLiquidityForm'

const NewPoolPage = () => {
  return (
    <div className="relative min-h-screen w-full bg-transparent text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none px-4 pb-4 pt-[20vw] md:px-[2vw] md:pb-[2vw] md:pt-[8vw]">

      <div className="relative z-10 w-full max-w-[420px] sm:max-w-[440px] md:max-w-[480px] mx-auto mb-3 sm:mb-4">
        <div className="card relative w-full rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3 shadow-xl">

          <Link
            href="/liquidity"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>

          <div className="h-4 w-[1px] bg-white/10" />

          <h1 className="text-sm sm:text-base font-bold tracking-wider text-white uppercase">
            Add Liquidity
          </h1>

        </div>
      </div>

      <Suspense fallback={null}>
        <AddLiquidityForm />
      </Suspense>

    </div>
  )
}

export default NewPoolPage
