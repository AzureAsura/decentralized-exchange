'use client'

import React from 'react'
import { ArrowDown, ExternalLink } from 'lucide-react'
import { BLOCK_EXPLORER_TX_URL, type Asset } from '@/lib/contracts'
import { truncateDisplayAmount } from '@/lib/format'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer'
import { TokenIcon } from '@/components/shared/TokenIcon'
import { SwapDetailRows } from '@/components/trade/SwapDetailRows'
import { TxFlowAnimation } from '@/components/trade/TxFlowAnimation'

export type SwapModalPhase = 'review' | 'sending' | 'success' | 'error'

interface SwapReviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    phase: SwapModalPhase
    sellAsset: Asset
    buyAsset: Asset
    sellDisplay: string
    buyDisplay: string
    rate: number | undefined
    priceImpact: number | undefined
    activeSide: 'sell' | 'buy'
    slippageBps: number
    amountOutMin: bigint | undefined
    amountInMax: bigint | undefined
    hash: `0x${string}` | undefined
    onConfirm: () => void
}

const SwapSummaryRow: React.FC<{ asset: Asset; amount: string }> = ({ asset, amount }) => (
    <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
            <TokenIcon symbol={asset.symbol} className="w-8 h-8" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight truncate min-w-0 flex-1">
            {truncateDisplayAmount(amount) || '0.0'}
        </span>
        <span className="text-sm font-semibold text-gray-300 shrink-0">{asset.symbol}</span>
    </div>
)

const SwapReviewBody: React.FC<Omit<SwapReviewModalProps, 'open' | 'onOpenChange'> & { onClose: () => void }> = ({
    phase,
    sellAsset,
    buyAsset,
    sellDisplay,
    buyDisplay,
    rate,
    priceImpact,
    activeSide,
    slippageBps,
    amountOutMin,
    amountInMax,
    hash,
    onConfirm,
    onClose,
}) => {
    if (phase === 'sending') {
        return (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
                <TxFlowAnimation status="sending" />
                <p className="text-white font-medium">Confirming your swap...</p>
            </div>
        )
    }

    if (phase === 'error') {
        return (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
                <TxFlowAnimation status="error" />
                <p className="text-red-400 font-medium">Swap failed or was rejected</p>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="btn-accent text-white font-semibold px-6 py-2 rounded-xl transition-all active:scale-95"
                >
                    Try Again
                </button>
            </div>
        )
    }

    if (phase === 'success') {
        return (
            <div className="flex flex-col gap-4 py-2">
                <div className="flex flex-col items-center gap-2 text-center">
                    <TxFlowAnimation status="success" />
                    <p className="text-emerald-400 font-semibold text-lg">Swap Successful!</p>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/5 p-3 flex flex-col gap-3">
                    <SwapSummaryRow asset={sellAsset} amount={sellDisplay} />
                    <div className="flex items-center justify-center -my-1">
                        <div className="p-1.5 rounded-lg bg-white/5 text-gray-400">
                            <ArrowDown className="w-4 h-4" />
                        </div>
                    </div>
                    <SwapSummaryRow asset={buyAsset} amount={buyDisplay} />
                </div>

                <div className="flex justify-between items-center text-xs text-gray-400 px-1">
                    <span>Rate</span>
                    <span className="text-white font-medium">
                        {rate ? `1 ${sellAsset.symbol} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${buyAsset.symbol}` : '—'}
                    </span>
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
                    onClick={onClose}
                    className="btn-color w-full text-white font-semibold text-base py-3 rounded-2xl transition-all active:scale-[0.99]"
                >
                    Close
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 py-2">
            <SwapSummaryRow asset={sellAsset} amount={sellDisplay} />
            <div className="flex items-center justify-center -my-1">
                <div className="p-1.5 rounded-lg bg-white/5 text-gray-400">
                    <ArrowDown className="w-4 h-4" />
                </div>
            </div>
            <SwapSummaryRow asset={buyAsset} amount={buyDisplay} />

            <div className="mt-1 pt-3 border-t border-white/10 flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center text-gray-400">
                    <span>Rate</span>
                    <span className="text-white font-medium">
                        {rate ? `1 ${sellAsset.symbol} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${buyAsset.symbol}` : '—'}
                    </span>
                </div>
                <SwapDetailRows
                    sellAsset={sellAsset}
                    buyAsset={buyAsset}
                    buyDisplay={buyDisplay}
                    priceImpact={priceImpact}
                    activeSide={activeSide}
                    slippageBps={slippageBps}
                    amountOutMin={amountOutMin}
                    amountInMax={amountInMax}
                />
            </div>

            <button
                type="button"
                onClick={onConfirm}
                className="btn-accent w-full text-white font-semibold text-base py-3 rounded-2xl transition-all active:scale-[0.99] mt-1"
            >
                Confirm Swap
            </button>
        </div>
    )
}

// Popup review sebelum swap dikirim — dibuka programatik dari SwapCard saat tombol "Swap" diklik
// (bukan langsung kirim tx). Fase 'review'/'sending'/'success'/'error' diturunkan dari status swapTx
// di SwapCard, dikunci (X disembunyikan, backdrop/escape diabaikan) selama 'sending'.
export const SwapReviewModal: React.FC<SwapReviewModalProps> = (props) => {
    const { open, onOpenChange, phase, sellAsset } = props
    const isDesktop = useMediaQuery('(min-width: 768px)')
    const isLocked = phase === 'sending'

    const handleOpenChange = (next: boolean) => {
        if (isLocked) return
        onOpenChange(next)
    }

    const title = phase === 'review' ? 'Review Swap' : `Swap ${sellAsset.symbol}`

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    showCloseButton={!isLocked}
                    className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white max-w-[28vw] min-w-[380px] rounded-[1.8vw] p-[1.5vw] shadow-2xl"
                >
                    <DialogHeader className="pb-1">
                        <DialogTitle className="text-lg font-semibold text-white tracking-tight">{title}</DialogTitle>
                    </DialogHeader>
                    <SwapReviewBody {...props} onClose={() => onOpenChange(false)} />
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white rounded-t-[28px] px-5 pb-8 pt-3">
                <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20 mb-4" />
                <DrawerHeader className="p-0 pb-2 text-left">
                    <DrawerTitle className="text-xl font-semibold text-white">{title}</DrawerTitle>
                </DrawerHeader>
                <SwapReviewBody {...props} onClose={() => onOpenChange(false)} />
            </DrawerContent>
        </Drawer>
    )
}
