'use client'

import React, { Suspense, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useCorrectNetwork } from '@/hooks/use-correct-network'
import { useImportedTokens } from '@/hooks/use-imported-tokens'
import { usePairPosition } from '@/hooks/use-pair-position'
import { useRemoveLiquidity } from '@/hooks/use-remove-liquidity'
import { TokenIcon } from '@/components/shared/TokenIcon'
import { TxActionButton } from '@/components/shared/TxActionButton'
import { AddLiquidityForm } from '@/components/liquidity/AddLiquidityForm'
import { RemoveLiquidityReviewModal } from '@/components/liquidity/RemoveLiquidityReviewModal'
import { ASSETS, WBNB_ADDRESS, findLogoUrl } from '@/lib/contracts'
import { formatAmount } from '@/lib/format'

// WBNB ditampilin sebagai "BNB" di UI — konsisten sama Swap/Add Liquidity.
const displaySymbol = (symbol: string) => (symbol === 'WBNB' ? 'BNB' : symbol)
const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

interface PairLiquidityViewProps {
  pairAddress: `0x${string}`
}

export const PairLiquidityView: React.FC<PairLiquidityViewProps> = ({ pairAddress }) => {
  const { isConnected } = useAccount()
  const { isWrongNetwork, isSwitching, switchToCorrectNetwork } = useCorrectNetwork()
  const [tab, setTab] = useState<'add' | 'remove'>('add')
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)

  const { token0, token1, symbol0, symbol1, userLpBalance, pooled0, pooled1 } = usePairPosition(pairAddress)
  const { importedTokens } = useImportedTokens()

  const isKnownTokenAddress = (address: `0x${string}` | undefined) => {
    if (!address) return false
    if (address.toLowerCase() === WBNB_ADDRESS.toLowerCase()) return true
    return [...ASSETS, ...importedTokens].some((a) => a.address?.toLowerCase() === address.toLowerCase())
  }
  const unknownTokenAddress = !isKnownTokenAddress(token0) ? token0 : !isKnownTokenAddress(token1) ? token1 : undefined

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
    <div className="relative min-h-screen w-full bg-transparent text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none px-4 pb-4 pt-[20vw] md:px-[2vw] md:pb-[2vw] md:pt-[8vw]">

    <div className="relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] flex items-center justify-between gap-3 mb-6">
  
  <div className="flex items-center gap-3 sm:gap-4">
    
    <Link
      href="/liquidity"
      className="card p-2.5 sm:p-3 rounded-2xl text-gray-300 hover:text-white transition-all duration-200 active:scale-95 shrink-0 flex items-center justify-center group"
      title="Back to all pools"
    >
      <ArrowLeft className="w-5 h-5 sm:w-5 sm:h-5 transition-transform group-hover:-translate-x-0.5" />
    </Link>

    <div className="flex items-center shrink-0">
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 border-2 border-[#0B0E17] flex items-center justify-center overflow-hidden shadow-md z-10">
        <TokenIcon 
          symbol={displaySymbol(symbol0)} 
          imageUrl={findLogoUrl(symbol0, importedTokens)} 
          className="w-full h-full object-cover p-1" 
        />
      </div>
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 border-2 border-[#0B0E17] flex items-center justify-center overflow-hidden shadow-md -ml-4 sm:-ml-4.5 z-0">
        <TokenIcon 
          symbol={displaySymbol(symbol1)} 
          imageUrl={findLogoUrl(symbol1, importedTokens)} 
          className="w-full h-full object-cover p-1" 
        />
      </div>
    </div>

    <h1 className="text-2xl sm:text-2xl font-black tracking-tight text-white uppercase">
      {displaySymbol(symbol0)}/{displaySymbol(symbol1)}
    </h1>

  </div>

</div>

      <div className="card relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] rounded-3xl md:rounded-[1.6vw] p-2 md:p-[0.55vw] transition-all duration-300">

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
          token0 && token1 ? (
            unknownTokenAddress ? (
              <p className="text-gray-400 text-sm md:text-[0.95vw] text-center px-2 md:px-[1vw] py-6 md:py-[2vw] leading-relaxed">
                This pool contains a token you haven&apos;t imported ({shortenAddress(unknownTokenAddress)}). Import
                it from the token selector in Swap or Add Liquidity to add liquidity here.
              </p>
            ) : (
              <Suspense fallback={null}>
                <AddLiquidityForm
                  initialTokenAAddress={token0}
                  initialTokenBAddress={token1}
                  locked
                  hideFooterText
                />
              </Suspense>
            )
          ) : (
            <p className="text-gray-400 text-sm md:text-[0.95vw] text-center px-2 md:px-[1vw] py-6 md:py-[2vw]">
              Loading pair...
            </p>
          )
        ) : (
          <>
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

                <div className="card rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] mt-1 md:mt-[0.2vw] border border-transparent">
                  <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium block mb-2 md:mb-[0.6vw]">
                    You will receive
                  </span>
                  <div className="flex flex-col gap-2 md:gap-[0.5vw]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-[0.5vw]">
                        <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full bg-white/10 flex items-center justify-center">
                          <TokenIcon symbol={displaySymbol(symbol0)} imageUrl={findLogoUrl(symbol0, importedTokens)} className="w-3.5 h-3.5 md:w-[1vw] md:h-[1vw]" />
                        </div>
                        <span className="text-sm md:text-[1vw] font-medium text-white">{displaySymbol(symbol0)}</span>
                      </div>
                      <span className="text-sm md:text-[1vw] font-semibold text-white">{formatAmount(receive0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-[0.5vw]">
                        <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full bg-white/10 flex items-center justify-center">
                          <TokenIcon symbol={displaySymbol(symbol1)} imageUrl={findLogoUrl(symbol1, importedTokens)} className="w-3.5 h-3.5 md:w-[1vw] md:h-[1vw]" />
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
        logoUrl0={findLogoUrl(symbol0, importedTokens)}
        logoUrl1={findLogoUrl(symbol1, importedTokens)}
        receive0={receive0}
        receive1={receive1}
        hash={hash}
        onConfirm={handleConfirmRemove}
      />

    </div>
  )
}
