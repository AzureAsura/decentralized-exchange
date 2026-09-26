import React from 'react'
import type { Asset } from '@/lib/contracts'
import { formatAmount } from '@/lib/format'

interface SwapDetailRowsProps {
    sellAsset: Asset
    buyAsset: Asset
    buyDisplay: string
    priceImpact: number | undefined
    activeSide: 'sell' | 'buy'
    slippageBps: number
    amountOutMin: bigint | undefined
    amountInMax: bigint | undefined
}

// 3 baris detail (Expected Output / Price Impact / Minimum received-Maximum sent) — dipakai
// SwapDetails.tsx (panel di kartu utama) dan SwapReviewModal.tsx (popup konfirmasi), supaya
// threshold warna price impact & label slippage nggak digandakan di dua tempat.
export const SwapDetailRows: React.FC<SwapDetailRowsProps> = ({
    sellAsset,
    buyAsset,
    buyDisplay,
    priceImpact,
    activeSide,
    slippageBps,
    amountOutMin,
    amountInMax,
}) => (
    <>
        <div className="flex justify-between items-center text-gray-400">
            <span>Expected Output</span>
            <span className="text-white font-semibold">{buyDisplay} {buyAsset.symbol}</span>
        </div>
        <div className="flex justify-between items-center text-gray-400">
            <span>Price Impact</span>
            <span className={priceImpact !== undefined && priceImpact > 3 ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>
                {priceImpact !== undefined ? `${priceImpact.toFixed(2)}%` : '—'}
            </span>
        </div>
        <div className="flex justify-between items-center text-gray-400">
            <span>{activeSide === 'sell' ? `Minimum received (${(slippageBps / 100).toFixed(2)}% slippage)` : `Maximum sent (${(slippageBps / 100).toFixed(2)}% slippage)`}</span>
            <span className="text-gray-300">
                {activeSide === 'sell' && amountOutMin !== undefined
                    ? `${formatAmount(amountOutMin)} ${buyAsset.symbol}`
                    : activeSide === 'buy' && amountInMax !== undefined
                        ? `${formatAmount(amountInMax)} ${sellAsset.symbol}`
                        : '—'}
            </span>
        </div>
    </>
)
