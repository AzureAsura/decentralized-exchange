'use client'

import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import React, { useState } from 'react'
import { TokenIcon } from '@/components/TokenIcon'
import type { Pair } from '@/lib/pairs'

const parseNumber = (value: string) => parseFloat(value.replace(/,/g, '')) || 0

interface PairLiquidityViewProps {
  pair: Pair
}

export const PairLiquidityView: React.FC<PairLiquidityViewProps> = ({ pair }) => {
  const [tab, setTab] = useState<'add' | 'remove'>('add')

  // STATE TAB ADD
  const [activeSide, setActiveSide] = useState<'a' | 'b'>('a')
  const [amountA, setAmountA] = useState('0')
  const [amountB, setAmountB] = useState('0')
  const parsedA = parseFloat(amountA) || 0
  const parsedB = parseFloat(amountB) || 0
  const hasRate = parsedA > 0 && parsedB > 0

  // STATE TAB REMOVE
  const [removePercent, setRemovePercent] = useState(0)
  const pooledA = pair.myLiquidity ? parseNumber(pair.myLiquidity.pooledA) : 0
  const pooledB = pair.myLiquidity ? parseNumber(pair.myLiquidity.pooledB) : 0
  const receiveA = (pooledA * removePercent) / 100
  const receiveB = (pooledB * removePercent) / 100

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

      {/* HEADER PAIR */}
      <div className="relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] flex items-center gap-3 md:gap-[0.8vw] mb-6 md:mb-[1.5vw]">
        <div className="flex items-center">
          <div className="w-9 h-9 md:w-[2.4vw] md:h-[2.4vw] rounded-full bg-white/10 flex items-center justify-center ring-2 ring-[#0B0E17]">
            <TokenIcon symbol={pair.tokenA} className="w-5 h-5 md:w-[1.3vw] md:h-[1.3vw]" />
          </div>
          <div className="w-9 h-9 md:w-[2.4vw] md:h-[2.4vw] rounded-full bg-white/10 flex items-center justify-center ring-2 ring-[#0B0E17] -ml-3 md:-ml-[0.8vw]">
            <TokenIcon symbol={pair.tokenB} className="w-5 h-5 md:w-[1.3vw] md:h-[1.3vw]" />
          </div>
        </div>
        <h1 className="text-2xl md:text-[1.8vw] font-[550] tracking-[-0.02em] text-[#E0E0E0]">
          {pair.tokenA}/{pair.tokenB}
        </h1>
      </div>

      {/* CONTAINER WIDGET */}
      <div className="card relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] rounded-3xl md:rounded-[1.6vw] p-2 md:p-[0.55vw] transition-all duration-300">

        {/* SEGMENTED TAB */}
        <div className="flex gap-1 md:gap-[0.3vw] p-1 md:p-[0.3vw] mb-2 md:mb-[0.4vw]">
          <button
            onClick={() => setTab('add')}
            className={`flex-1 py-2 md:py-[0.55vw] rounded-xl md:rounded-[0.9vw] text-sm md:text-[1vw] font-semibold transition-all duration-200 ${
              tab === 'add' ? 'card-light text-white ' : 'text-gray-400 hover:text-white card'
            }`}
          >
            Add
          </button>
          <button
            onClick={() => setTab('remove')}
            className={`flex-1 py-2 md:py-[0.55vw] rounded-xl md:rounded-[0.9vw] text-sm md:text-[1vw] font-semibold transition-all duration-200 ${
              tab === 'remove' ? 'card-light text-white ' : 'text-gray-400 hover:text-white card'
            }`}
          >
            Remove
          </button>
        </div>

        {tab === 'add' ? (
          <>
            {/* TOKEN A CARD */}
            <div
              onClick={() => setActiveSide('a')}
              className={`rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] transition-all duration-300 cursor-text relative ${
                activeSide === 'a'
                  ? 'card-dark border border-blue-500/50 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                  : 'card border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1 md:mb-[0.1vw]">
                <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium">
                  First token
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  onFocus={() => setActiveSide('a')}
                  className={`bg-transparent text-3xl md:text-[2.8vw] font-bold outline-none w-[55%] tracking-tight leading-none transition-colors ${
                    activeSide === 'a' ? 'text-white' : 'text-gray-500'
                  }`}
                />
                <div className="flex items-center gap-2 md:gap-[0.5vw] card-light rounded-full py-1.5 md:py-[0.4vw] px-3 md:px-[0.9vw] shrink-0">
                  <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full bg-white/10 flex items-center justify-center text-xs md:text-[0.9vw]">
                    <TokenIcon symbol={pair.tokenA} className="w-3.5 h-3.5 md:w-[1vw] md:h-[1vw]" />
                  </div>
                  <span className="text-sm md:text-[1.1vw] font-[600] tracking-tight text-white">{pair.tokenA}</span>
                </div>
              </div>
              <span className="text-gray-400 text-xs md:text-[1vw] font-normal block leading-none ml-0.5 md:ml-[0.1vw] mt-1 md:mt-0">
                $0
              </span>
            </div>

            {/* PLUS DIVIDER */}
            <div className="relative h-2 md:h-[0.6vw] flex items-center justify-center -my-1 md:my-[-0.2vw] z-20">
              <div className="relative h-3 md:h-[0.8vw] flex items-center justify-center -my-1.5 md:my-[-0.35vw] z-20">
                <div className="btn-color text-white p-2 md:p-[0.55vw] rounded-xl md:rounded-[0.9vw] shadow-[0_4px_15px_rgba(0,0,0,0.4)] flex items-center justify-center">
                  <Plus className="w-4 h-4 md:w-[1.2vw] md:h-[1.2vw] stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* TOKEN B CARD */}
            <div
              onClick={() => setActiveSide('b')}
              className={`rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] transition-all duration-300 cursor-text relative mt-1 md:mt-[0.2vw] ${
                activeSide === 'b'
                  ? 'card-dark border border-blue-500/50 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                  : 'card border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1 md:mb-[0.1vw]">
                <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium">
                  Second token
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  onFocus={() => setActiveSide('b')}
                  className={`bg-transparent text-3xl md:text-[2.8vw] font-bold outline-none w-[55%] tracking-tight leading-none transition-colors ${
                    activeSide === 'b' ? 'text-white' : 'text-gray-500'
                  }`}
                />
                <div className="flex items-center gap-2 md:gap-[0.5vw] card-light rounded-full py-1.5 md:py-[0.4vw] px-3 md:px-[0.9vw] shrink-0">
                  <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full bg-white/10 flex items-center justify-center text-xs md:text-[0.9vw]">
                    <TokenIcon symbol={pair.tokenB} className="w-3.5 h-3.5 md:w-[1vw] md:h-[1vw]" />
                  </div>
                  <span className="text-sm md:text-[1.1vw] font-[600] tracking-tight text-white">{pair.tokenB}</span>
                </div>
              </div>
              <span className="text-gray-400 text-xs md:text-[1vw] font-normal block leading-none ml-0.5 md:ml-[0.1vw] mt-1 md:mt-0">
                $0
              </span>
            </div>

            {/* POOL INFO */}
            <div className="card mt-1 md:mt-[0.2vw] rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] border border-transparent">
              <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium block mb-2 md:mb-[0.6vw]">
                Prices and pool share
              </span>
              <div className="flex items-center justify-between text-xs md:text-[0.9vw]">
                <div className="flex flex-col items-start gap-1 md:gap-[0.3vw]">
                  <span className="text-white font-semibold">{hasRate ? (parsedA / parsedB).toFixed(6) : '-'}</span>
                  <span className="text-gray-500">{pair.tokenA} per {pair.tokenB}</span>
                </div>
                <div className="flex flex-col items-center gap-1 md:gap-[0.3vw]">
                  <span className="text-white font-semibold">{hasRate ? (parsedB / parsedA).toFixed(6) : '-'}</span>
                  <span className="text-gray-500">{pair.tokenB} per {pair.tokenA}</span>
                </div>
                <div className="flex flex-col items-end gap-1 md:gap-[0.3vw]">
                  <span className="text-white font-semibold">{hasRate ? '<0.01%' : '-'}</span>
                  <span className="text-gray-500">Share of pool</span>
                </div>
              </div>
            </div>

            <button
              disabled={!hasRate}
              className="btn-color w-full mt-2 md:mt-[0.4vw] text-white font-semibold text-base md:text-[1.15vw] py-3 md:py-[0.85vw] rounded-2xl md:rounded-[1.2vw] transition-all active:scale-[0.99] tracking-tight disabled:opacity-40 disabled:active:scale-100"
            >
              {hasRate ? 'Supply' : 'Enter an amount'}
            </button>
          </>
        ) : (
          <>
            {/* POSISI ANDA */}
            <div className="card rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] border border-transparent">
              <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium block mb-2 md:mb-[0.6vw]">
                Your position
              </span>
              {pair.myLiquidity ? (
                <div className="flex items-center justify-between text-xs md:text-[0.9vw]">
                  <div className="flex flex-col items-start gap-1 md:gap-[0.3vw]">
                    <span className="text-white font-semibold">{pair.myLiquidity.lpTokens}</span>
                    <span className="text-gray-500">LP tokens</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 md:gap-[0.3vw]">
                    <span className="text-white font-semibold">{pair.myLiquidity.pooledA} {pair.tokenA}</span>
                    <span className="text-gray-500">Pooled {pair.tokenA}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 md:gap-[0.3vw]">
                    <span className="text-white font-semibold">{pair.myLiquidity.pooledB} {pair.tokenB}</span>
                    <span className="text-gray-500">Pooled {pair.tokenB}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-xs md:text-[0.9vw]">
                  You don&apos;t have liquidity in this pool yet.
                </p>
              )}
            </div>

            {pair.myLiquidity && (
              <>
                {/* PERSEN AMOUNT */}
                <div className="card-dark rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-4 md:py-[1.1vw] mt-1 md:mt-[0.2vw] border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <div className="flex items-end justify-between mb-3 md:mb-[0.8vw]">
                    <span className="text-4xl md:text-[3vw] font-bold tracking-tight leading-none text-white">
                      {removePercent}%
                    </span>
                    <div className="flex gap-1.5 md:gap-[0.4vw]">
                      {[25, 50, 75, 100].map((p) => (
                        <button
                          key={p}
                          onClick={() => setRemovePercent(p)}
                          className={`text-xs md:text-[0.8vw] font-semibold px-2.5 md:px-[0.7vw] py-1 md:py-[0.3vw] rounded-full transition-all active:scale-95 ${
                            removePercent === p
                              ? 'btn-color text-white'
                              : 'card-light text-gray-300 hover:text-white'
                          }`}
                        >
                          {p === 100 ? 'Max' : `${p}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={removePercent}
                    onChange={(e) => setRemovePercent(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* PLUS DIVIDER */}
                <div className="relative h-2 md:h-[0.6vw] flex items-center justify-center -my-1 md:my-[-0.2vw] z-20">

                </div>

                {/* PREVIEW DITERIMA */}
                <div className="card rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] mt-1 md:mt-[0.2vw] border border-transparent">
                  <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium block mb-2 md:mb-[0.6vw]">
                    You will receive
                  </span>
                  <div className="flex flex-col gap-2 md:gap-[0.5vw]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-[0.5vw]">
                        <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full bg-white/10 flex items-center justify-center">
                          <TokenIcon symbol={pair.tokenA} className="w-3.5 h-3.5 md:w-[1vw] md:h-[1vw]" />
                        </div>
                        <span className="text-sm md:text-[1vw] font-medium text-white">{pair.tokenA}</span>
                      </div>
                      <span className="text-sm md:text-[1vw] font-semibold text-white">{receiveA.toFixed(6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-[0.5vw]">
                        <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full bg-white/10 flex items-center justify-center">
                          <TokenIcon symbol={pair.tokenB} className="w-3.5 h-3.5 md:w-[1vw] md:h-[1vw]" />
                        </div>
                        <span className="text-sm md:text-[1vw] font-medium text-white">{pair.tokenB}</span>
                      </div>
                      <span className="text-sm md:text-[1vw] font-semibold text-white">{receiveB.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <button
              disabled={!pair.myLiquidity || removePercent === 0}
              className="btn-color w-full mt-2 md:mt-[0.4vw] text-white font-semibold text-base md:text-[1.15vw] py-3 md:py-[0.85vw] rounded-2xl md:rounded-[1.2vw] transition-all active:scale-[0.99] tracking-tight disabled:opacity-40 disabled:active:scale-100"
            >
              {!pair.myLiquidity ? 'No liquidity to remove' : removePercent === 0 ? 'Select an amount' : 'Remove liquidity'}
            </button>
          </>
        )}
      </div>

      {/* FOOTER TEXT */}
      <p className="relative z-10 text-gray-400 text-xs md:text-[1.1vw] w-full max-w-[360px] md:max-w-[32vw] text-center mt-6 md:mt-[2vw] mb-6 md:mb-[3vw] leading-relaxed tracking-tight font-normal drop-shadow-sm">
        {tab === 'add' ? (
          <>
            By adding liquidity you will earn <span className="text-blue-400 font-medium">pool fees</span> proportional to your share of the pool.
          </>
        ) : (
          <>
            Removing liquidity <span className="text-blue-400 font-medium">burns your LP tokens</span> and returns your share of {pair.tokenA} and {pair.tokenB} plus earned fees.
          </>
        )}
      </p>

    </div>
  )
}