'use client'

import React from 'react'
import { ExternalLink, Plus } from 'lucide-react'
import { BLOCK_EXPLORER_TX_URL, type Asset } from '@/lib/contracts'
import { formatAmount } from '@/lib/format'
import { TxFlowModal } from '@/components/shared/TxFlowModal'
import { AssetAmountRow } from '@/components/shared/AssetAmountRow'
import { TxFlowAnimation } from '@/components/shared/TxFlowAnimation'

export type AddLiquidityModalPhase = 'review' | 'sending' | 'success' | 'error'

interface AddLiquidityReviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    phase: AddLiquidityModalPhase
    tokenA: Asset
    tokenB: Asset
    amountADisplay: string
    amountBDisplay: string
    pairExists: boolean
    amountAMin: bigint
    amountBMin: bigint
    hash: `0x${string}` | undefined
    onConfirm: () => void
}

export const AddLiquidityReviewModal: React.FC<AddLiquidityReviewModalProps> = ({
    open,
    onOpenChange,
    phase,
    tokenA,
    tokenB,
    amountADisplay,
    amountBDisplay,
    pairExists,
    amountAMin,
    amountBMin,
    hash,
    onConfirm,
}) => {
    const title = phase === 'review' ? 'Review Supply' : 'Add Liquidity'

    return (
        <TxFlowModal open={open} onOpenChange={onOpenChange} locked={phase === 'sending'} title={title}>
            {phase === 'sending' && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <TxFlowAnimation status="sending" />
                    <p className="text-white font-medium">Confirming your supply...</p>
                </div>
            )}

            {phase === 'error' && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <TxFlowAnimation status="error" />
                    <p className="text-red-400 font-medium">Supply failed or was rejected</p>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="btn-accent text-white font-semibold px-6 py-2 rounded-xl transition-all active:scale-95"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {phase === 'success' && (
                <div className="flex flex-col gap-4 py-2">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <TxFlowAnimation status="success" />
                        <p className="text-emerald-400 font-semibold text-lg">Liquidity Added!</p>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/5 p-3 flex flex-col gap-3">
                        <AssetAmountRow asset={tokenA} amount={amountADisplay} />
                        <div className="flex items-center justify-start pl-8 -my-1">
                            <div className="p-1.5 rounded-lg bg-white/5 text-gray-400">
                                <Plus className="w-4 h-4" />
                            </div>
                        </div>
                        <AssetAmountRow asset={tokenB} amount={amountBDisplay} />
                    </div>

                    {hash && (
                        <a
                            href={`${BLOCK_EXPLORER_TX_URL}${hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                        >
                            View on BscScan
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}

                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="btn-color w-full text-white font-semibold text-base py-3 rounded-2xl transition-all active:scale-[0.99]"
                    >
                        Close
                    </button>
                </div>
            )}

            {phase === 'review' && (
                <div className="flex flex-col gap-3 py-2">
                    <AssetAmountRow asset={tokenA} amount={amountADisplay} />
                    <div className="flex items-center justify-start pl-8 -my-1">
                        <div className="p-1.5 rounded-lg bg-white/5 text-gray-400">
                            <Plus className="w-4 h-4" />
                        </div>
                    </div>
                    <AssetAmountRow asset={tokenB} amount={amountBDisplay} />

                    {pairExists && (
                        <div className="mt-1 pt-3 border-t border-white/10 flex flex-col gap-2 text-xs">
                            <div className="flex justify-between items-center text-gray-400">
                                <span>Minimum {tokenA.symbol}</span>
                                <span className="text-gray-300">{formatAmount(amountAMin)} {tokenA.symbol}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-400">
                                <span>Minimum {tokenB.symbol}</span>
                                <span className="text-gray-300">{formatAmount(amountBMin)} {tokenB.symbol}</span>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onConfirm}
                        className="btn-accent w-full text-white font-semibold text-base py-3 rounded-2xl transition-all active:scale-[0.99] mt-1"
                    >
                        Confirm Supply
                    </button>
                </div>
            )}
        </TxFlowModal>
    )
}
