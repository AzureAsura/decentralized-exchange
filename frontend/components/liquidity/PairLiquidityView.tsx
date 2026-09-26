'use client'

import React, { useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useCorrectNetwork } from '@/hooks/use-correct-network'
import { usePairPosition } from '@/hooks/use-pair-position'
import { useRemoveLiquidity } from '@/hooks/use-remove-liquidity'
import { TokenIcon } from '@/components/shared/TokenIcon'
import { TxActionButton } from '@/components/shared/TxActionButton'
import { RemoveLiquidityReviewModal } from '@/components/liquidity/RemoveLiquidityReviewModal'
import { formatAmount } from '@/lib/format'

// WBNB ditampilin sebagai "BNB" di UI — konsisten sama Swap/Add Liquidity.
const displaySymbol = (symbol: string) => (symbol === 'WBNB' ? 'BNB' : symbol)

interface PairLiquidityViewProps {
  pairAddress: `0x${string}`
}

export const PairLiquidityView: React.FC<PairLiquidityViewProps> = ({ pairAddress }) => {
  const { isConnected } = useAccount()
  const { isWrongNetwork, isSwitching, switchToCorrectNetwork } = useCorrectNetwork()
  const [tab, setTab] = useState<'add' | 'remove'>('add')
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)

  const { token0, token1, symbol0, symbol1, userLpBalance, pooled0, pooled1 } = usePairPosition(pairAddress)

  const {
    removePercent,
    setRemovePercent,
    receive0,
    receive1,
    hasPosition,
    phase,
    sendingLabel,
    hash,
    handleConfirmRemove,
    resetTxState,
    resetAfterSuccess,
  } = useRemoveLiquidity(pairAddress)

  const handleRemoveModalOpenChange = (open: boolean) => {
    setIsRemoveModalOpen(open)
    if (!open && phase === 'success') {
      resetAfterSuccess()
    }
  }

  const handleRemoveClick = () => {
    resetTxState()
    setIsRemoveModalOpen(true)
  }

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
            <TokenIcon symbol={displaySymbol(symbol0)} className="w-5 h-5 md:w-[1.3vw] md:h-[1.3vw]" />
          </div>
          <div className="w-9 h-9 md:w-[2.4vw] md:h-[2.4vw] rounded-full bg-white/10 flex items-center justify-center ring-2 ring-[#0B0E17] -ml-3 md:-ml-[0.8vw]">
            <TokenIcon symbol={displaySymbol(symbol1)} className="w-5 h-5 md:w-[1.3vw] md:h-[1.3vw]" />
          </div>
        </div>
        <h1 className="text-2xl md:text-[1.8vw] font-[550] tracking-[-0.02em] text-[#E0E0E0]">
          {displaySymbol(symbol0)}/{displaySymbol(symbol1)}
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
            <p className="text-gray-400 text-sm md:text-[0.95vw] text-center px-2 md:px-[1vw] py-6 md:py-[2vw]">
              Add more {displaySymbol(symbol0)}/{displaySymbol(symbol1)} liquidity from the Add Liquidity page.
            </p>
            <Link
              href={token0 && token1 ? `/liquidity/new?tokenA=${token0}&tokenB=${token1}` : '/liquidity/new'}
              className="btn-color w-full flex items-center justify-center gap-2 text-white font-semibold text-base md:text-[1.1vw] py-3 md:py-[0.8vw] rounded-2xl transition-all active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              Add more liquidity
            </Link>
          </>
        ) : (
          <>
            {/* POSISI ANDA */}
            <div className="card rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] border border-transparent">
              <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium block mb-2 md:mb-[0.6vw]">
                Your position
              </span>
              {hasPosition ? (
                <div className="flex items-center justify-between text-xs md:text-[0.9vw]">
                  <div className="flex flex-col items-start gap-1 md:gap-[0.3vw]">
                    <span className="text-white font-semibold">{formatAmount(userLpBalance ?? BigInt(0))}</span>
                    <span className="text-gray-500">LP tokens</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 md:gap-[0.3vw]">
                    <span className="text-white font-semibold">{formatAmount(pooled0)} {displaySymbol(symbol0)}</span>
                    <span className="text-gray-500">Pooled {displaySymbol(symbol0)}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 md:gap-[0.3vw]">
                    <span className="text-white font-semibold">{formatAmount(pooled1)} {displaySymbol(symbol1)}</span>
                    <span className="text-gray-500">Pooled {displaySymbol(symbol1)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-xs md:text-[0.9vw]">
                  You don&apos;t have liquidity in this pool yet.
                </p>
              )}
            </div>

            {hasPosition && (
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

                {/* PREVIEW DITERIMA */}
                <div className="card rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] mt-1 md:mt-[0.2vw] border border-transparent">
                  <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium block mb-2 md:mb-[0.6vw]">
                    You will receive
                  </span>
                  <div className="flex flex-col gap-2 md:gap-[0.5vw]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-[0.5vw]">
                        <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full bg-white/10 flex items-center justify-center">
                          <TokenIcon symbol={displaySymbol(symbol0)} className="w-3.5 h-3.5 md:w-[1vw] md:h-[1vw]" />
                        </div>
                        <span className="text-sm md:text-[1vw] font-medium text-white">{displaySymbol(symbol0)}</span>
                      </div>
                      <span className="text-sm md:text-[1vw] font-semibold text-white">{formatAmount(receive0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-[0.5vw]">
                        <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full bg-white/10 flex items-center justify-center">
                          <TokenIcon symbol={displaySymbol(symbol1)} className="w-3.5 h-3.5 md:w-[1vw] md:h-[1vw]" />
                        </div>
                        <span className="text-sm md:text-[1vw] font-medium text-white">{displaySymbol(symbol1)}</span>
                      </div>
                      <span className="text-sm md:text-[1vw] font-semibold text-white">{formatAmount(receive1)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-2 md:mt-[0.4vw]">
              <TxActionButton
                sizeClassName="text-base md:text-[1.15vw] py-3 md:py-[0.85vw] rounded-2xl md:rounded-[1.2vw]"
                isConnected={isConnected}
                isWrongNetwork={isWrongNetwork}
                isSwitching={isSwitching}
                onSwitchNetwork={switchToCorrectNetwork}
                isSuccess={phase === 'success'}
                successContent={
                  <div className="flex flex-col items-center gap-1 text-center py-2">
                    <span className="text-emerald-400 text-sm md:text-[1vw] font-semibold">Liquidity removed!</span>
                  </div>
                }
                approvalSteps={[]}
                submit={{
                  disabled: !hasPosition || removePercent === 0,
                  isPending: phase === 'sending',
                  isConfirming: false,
                  confirmingLabel: 'Removing...',
                  idleLabel: !hasPosition ? 'No liquidity to remove' : removePercent === 0 ? 'Select an amount' : 'Remove Liquidity',
                  onSubmit: handleRemoveClick,
                }}
                submitVariant={hasPosition && removePercent > 0 ? 'accent' : 'primary'}
              />
            </div>
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
            Removing liquidity <span className="text-blue-400 font-medium">burns your LP tokens</span> and returns your share of {displaySymbol(symbol0)} and {displaySymbol(symbol1)} plus earned fees.
          </>
        )}
      </p>

      <RemoveLiquidityReviewModal
        open={isRemoveModalOpen}
        onOpenChange={handleRemoveModalOpenChange}
        phase={phase}
        sendingLabel={sendingLabel}
        symbol0={symbol0}
        symbol1={symbol1}
        receive0={receive0}
        receive1={receive1}
        hash={hash}
        onConfirm={handleConfirmRemove}
      />

    </div>
  )
}
