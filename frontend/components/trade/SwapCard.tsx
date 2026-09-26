'use client'

import React, { useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useCorrectNetwork } from '@/hooks/use-correct-network'
import { useSwap } from '@/hooks/use-swap'
import { SettingsModal } from '@/components/shared/SettingsModal'
import { TxActionButton } from '@/components/shared/TxActionButton'
import { TokenInputCard } from '@/components/trade/TokenInputCard'
import { SwapDetails } from '@/components/trade/SwapDetails'

export const SwapCard: React.FC = () => {
    const { isConnected } = useAccount()
    const { isWrongNetwork, isSwitching, switchToCorrectNetwork } = useCorrectNetwork()
    const [isDetailsOpen, setIsDetailsOpen] = useState(true)

    const {
        sellAsset,
        buyAsset,
        sellDisplay,
        buyDisplay,
        activeSide,
        sellBalance,
        buyBalance,
        setSellInput,
        setBuyInput,
        handleFocusSell,
        handleFocusBuy,
        handleSwapDirection,
        handleSelectSellAsset,
        handleSelectBuyAsset,
        handleApprove,
        handleSwap,
        hasEnteredValues,
        isQuoting,
        quoteError,
        rate,
        priceImpact,
        amountOutMin,
        amountInMax,
        slippageBps,
        needsApproval,
        approveTx,
        swapTx,
    } = useSwap()

    return (
        <div className="relative min-h-screen w-full bg-transparent text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none p-4 md:p-[2vw]">

            {/* CONTAINER WIDGET */}
            <div className="card relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] rounded-3xl md:rounded-[1.6vw] p-2 md:p-[0.55vw] transition-all duration-300">

                {/* HEADER WIDGET (SWAP + SETTING) */}
                <div className="flex items-center justify-between px-3 md:px-[0.8vw] pt-2 md:pt-[0.4vw] pb-2 md:pb-[0.5vw]">
                    <span className="text-base md:text-[1.1vw] font-bold text-white tracking-tight">Swap</span>
                    <SettingsModal
                        trigger={
                            <button
                                type="button"
                                className="p-1.5 md:p-[0.4vw] rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                                title="Swap Settings"
                            >
                                <svg className="w-4 h-4 md:w-[1.1vw] md:h-[1.1vw]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        }
                    />
                </div>

                <TokenInputCard
                    variant="sell"
                    label="Sell"
                    isActive={activeSide === 'sell'}
                    value={sellDisplay}
                    onChange={setSellInput}
                    onFocus={handleFocusSell}
                    asset={sellAsset}
                    excludeSymbol={buyAsset.symbol}
                    onSelect={handleSelectSellAsset}
                    balance={sellBalance}
                />

                {/* SWAP BUTTON */}
                <div className="relative h-2 md:h-[0.6vw] flex items-center justify-center -my-1 md:my-[-0.2vw] z-20">
                    <div className="relative h-3 md:h-[0.8vw] flex items-center justify-center -my-1.5 md:my-[-0.35vw] z-20">
                        <button
                            onClick={handleSwapDirection}
                            className="btn-color text-white p-2 md:p-[0.55vw] rounded-xl md:rounded-[0.9vw] transition-all duration-200 active:scale-90 hover:scale-105 shadow-[0_4px_15px_rgba(0,0,0,0.4)] flex items-center justify-center group"
                            title="Swap direction"
                        >
                            <ArrowDown className="w-4 h-4 md:w-[1.2vw] md:h-[1.2vw] stroke-[2.5] transition-transform duration-300 group-hover:rotate-180" />
                        </button>
                    </div>
                </div>

                <TokenInputCard
                    variant="buy"
                    label="Buy"
                    isActive={activeSide === 'buy'}
                    value={buyDisplay}
                    onChange={setBuyInput}
                    onFocus={handleFocusBuy}
                    asset={buyAsset}
                    excludeSymbol={sellAsset.symbol}
                    onSelect={handleSelectBuyAsset}
                    balance={buyBalance}
                />

                {/* DETAIL SWAP (real, bukan mockup lagi) */}
                {hasEnteredValues && (
                    <SwapDetails
                        isDetailsOpen={isDetailsOpen}
                        onToggleDetails={() => setIsDetailsOpen(!isDetailsOpen)}
                        rate={rate}
                        isQuoting={isQuoting}
                        sellAsset={sellAsset}
                        buyAsset={buyAsset}
                        buyDisplay={buyDisplay}
                        priceImpact={priceImpact}
                        activeSide={activeSide}
                        slippageBps={slippageBps}
                        amountOutMin={amountOutMin}
                        amountInMax={amountInMax}
                    />
                )}

                {/* STATUS */}
                {(approveTx.error || swapTx.error) && (
                    <p className="text-red-400 text-xs md:text-[0.85vw] text-center mt-2 md:mt-[0.5vw]">
                        Transaction failed — please try again.
                    </p>
                )}
                {!approveTx.error && !swapTx.error && quoteError && (
                    <p className="text-red-400 text-xs md:text-[0.85vw] text-center mt-2 md:mt-[0.5vw]">
                        Insufficient liquidity for this trade — try a smaller amount.
                    </p>
                )}

                {/* BUTTON ACTION */}
                <div className="mt-2 md:mt-[0.4vw]">
                    <TxActionButton
                        sizeClassName="text-base md:text-[1.15vw] py-3 md:py-[0.85vw] rounded-2xl md:rounded-[1.2vw]"
                        isConnected={isConnected}
                        isWrongNetwork={isWrongNetwork}
                        isSwitching={isSwitching}
                        onSwitchNetwork={switchToCorrectNetwork}
                        isSuccess={swapTx.isSuccess}
                        successContent={
                            <div className="flex flex-col items-center gap-1 text-center py-2">
                                <span className="text-emerald-400 text-sm md:text-[1vw] font-semibold">Swap complete!</span>
                            </div>
                        }
                        approvalSteps={[
                            {
                                needsApproval,
                                label: `Approve ${sellAsset.symbol}`,
                                disabled: !hasEnteredValues,
                                isPending: approveTx.isPending,
                                isConfirming: approveTx.isConfirming,
                                onApprove: handleApprove,
                            },
                        ]}
                        submit={{
                            disabled: !hasEnteredValues || isQuoting || Boolean(quoteError),
                            isPending: swapTx.isPending,
                            isConfirming: swapTx.isConfirming,
                            confirmingLabel: 'Swapping...',
                            idleLabel: quoteError ? 'Insufficient liquidity' : hasEnteredValues ? 'Swap' : 'Enter an amount',
                            onSubmit: handleSwap,
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
