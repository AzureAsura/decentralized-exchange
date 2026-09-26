import React from 'react'
import { ChevronDown, Info } from 'lucide-react'
import type { Asset } from '@/lib/contracts'
import { SwapDetailRows } from '@/components/trade/SwapDetailRows'

interface SwapDetailsProps {
    isDetailsOpen: boolean
    onToggleDetails: () => void
    rate: number | undefined
    isQuoting: boolean
    sellAsset: Asset
    buyAsset: Asset
    buyDisplay: string
    priceImpact: number | undefined
    activeSide: 'sell' | 'buy'
    slippageBps: number
    amountOutMin: bigint | undefined
    amountInMax: bigint | undefined
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({
    isDetailsOpen,
    onToggleDetails,
    rate,
    isQuoting,
    sellAsset,
    buyAsset,
    buyDisplay,
    priceImpact,
    activeSide,
    slippageBps,
    amountOutMin,
    amountInMax,
}) => (
    <div className={`mt-2 md:mt-[0.5vw] rounded-2xl md:rounded-[1.2vw] card p-3 md:p-[0.8vw] border border-white/5 animate-in fade-in slide-in-from-top-2 duration-200 transition-opacity ${isQuoting ? 'opacity-60' : 'opacity-100'}`}>
        <div
            onClick={onToggleDetails}
            className="flex items-center justify-between cursor-pointer text-xs md:text-[0.85vw] text-gray-300 font-medium"
        >
            <div className="flex items-center gap-1.5 md:gap-[0.4vw]">
                <Info className="w-3.5 h-3.5 md:w-[0.9vw] md:h-[0.9vw] text-gray-400" />
                <span>{rate ? `1 ${sellAsset.symbol} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${buyAsset.symbol}` : isQuoting ? 'Fetching quote...' : '—'}</span>
            </div>
            <ChevronDown className={`w-4 h-4 md:w-[1vw] md:h-[1vw] text-gray-400 transition-transform duration-200 ${isDetailsOpen ? 'rotate-180' : ''}`} />
        </div>

        {isDetailsOpen && (
            <div className="mt-3 md:mt-[0.6vw] pt-3 md:pt-[0.6vw] border-t border-white/10 flex flex-col gap-2 md:gap-[0.4vw] text-xs md:text-[0.8vw]">
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
        )}
    </div>
)
