import React from 'react'
import { ASSETS, type Asset } from '@/lib/contracts'
import { AssetSelectModal } from '@/components/shared/AssetSelectModal'
import { TokenSelectButton } from '@/components/shared/TokenSelectButton'

interface TokenAmountCardProps {
    label: string
    asset: Asset
    excludeSymbol: string
    onSelect: (asset: Asset) => void
    amount: string
    onAmountChange: (value: string) => void
}

export const TokenAmountCard: React.FC<TokenAmountCardProps> = ({
    label,
    asset,
    excludeSymbol,
    onSelect,
    amount,
    onAmountChange,
}) => (
    <div className="rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] card">
        <span className="text-gray-400 text-xs md:text-[0.9vw] font-medium block mb-1">{label}</span>
        <div className="flex items-center justify-between gap-2">
            <input
                type="text"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="0.0"
                className="bg-transparent text-3xl md:text-[2.8vw] font-bold outline-none w-[55%] tracking-tight leading-none text-white placeholder-gray-600"
            />
            <AssetSelectModal
                assets={ASSETS}
                excludeSymbol={excludeSymbol}
                onSelect={onSelect}
                trigger={<TokenSelectButton symbol={asset.symbol} />}
            />
        </div>
    </div>
)
