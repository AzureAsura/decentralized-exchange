'use client'

import React from 'react'
import { ExternalLink } from 'lucide-react'
import { BLOCK_EXPLORER_TX_URL } from '@/lib/contracts'
import { formatAmount } from '@/lib/format'
import { TxFlowModal } from '@/components/shared/TxFlowModal'
import { TokenIcon } from '@/components/shared/TokenIcon'
import { TxFlowAnimation } from '@/components/shared/TxFlowAnimation'
import type { RemovePhase } from '@/hooks/use-remove-liquidity'

interface RemoveLiquidityReviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    phase: RemovePhase
    sendingLabel: string
    symbol0: string
    symbol1: string
    receive0: bigint
    receive1: bigint
    hash: `0x${string}` | undefined
    onConfirm: () => void
}

// WBNB ditampilin sebagai "BNB" di UI — konsisten sama Swap/Add Liquidity yang selalu pakai
// simbol native, walau reserve on-chain-nya secara teknis WBNB.
const displaySymbol = (symbol: string) => (symbol === 'WBNB' ? 'BNB' : symbol)

const ReceiveRow: React.FC<{ symbol: string; amount: bigint }> = ({ symbol, amount }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                <TokenIcon symbol={displaySymbol(symbol)} className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-white">{displaySymbol(symbol)}</span>
        </div>
        <span className="text-sm font-semibold text-white">{formatAmount(amount)}</span>
    </div>
)

// Popup review sebelum remove liquidity dikirim — sama pola SwapReviewModal/AddLiquidityReviewModal.
// `sendingLabel` dinamis karena alurnya bisa 1 langkah (permit) atau 2 langkah (approve + remove
// klasik, kalau user nolak tanda tangan permit) — lihat use-remove-liquidity.ts.
export const RemoveLiquidityReviewModal: React.FC<RemoveLiquidityReviewModalProps> = ({
    open,
    onOpenChange,
    phase,
    sendingLabel,
    symbol0,
    symbol1,
    receive0,
    receive1,
    hash,
    onConfirm,
}) => {
    const title = phase === 'review' ? 'Review Remove' : 'Remove Liquidity'

    return (
        <TxFlowModal open={open} onOpenChange={onOpenChange} locked={phase === 'sending'} title={title}>
            {phase === 'sending' && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <TxFlowAnimation status="sending" />
                    <p className="text-white font-medium">{sendingLabel}</p>
                </div>
            )}

            {phase === 'error' && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <TxFlowAnimation status="error" />
                    <p className="text-red-400 font-medium">Remove failed or was rejected</p>
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
                        <p className="text-emerald-400 font-semibold text-lg">Liquidity Removed!</p>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/5 p-3 flex flex-col gap-3">
                        <ReceiveRow symbol={symbol0} amount={receive0} />
                        <ReceiveRow symbol={symbol1} amount={receive1} />
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
                    <span className="text-gray-400 text-xs font-medium">You will receive</span>
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-3 flex flex-col gap-3">
                        <ReceiveRow symbol={symbol0} amount={receive0} />
                        <ReceiveRow symbol={symbol1} amount={receive1} />
                    </div>
                    <p className="text-gray-500 text-xs">
                        Usually just 1 signature (permit). If it&apos;s rejected, this automatically falls back to
                        approve + remove (2 transactions).
                    </p>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="btn-accent w-full text-white font-semibold text-base py-3 rounded-2xl transition-all active:scale-[0.99] mt-1"
                    >
                        Confirm Remove
                    </button>
                </div>
            )}
        </TxFlowModal>
    )
}
