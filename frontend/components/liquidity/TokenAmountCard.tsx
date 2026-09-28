import React from 'react'
import { formatUnits } from 'viem'
import { ASSETS, type Asset } from '@/lib/contracts'
import { AssetSelectModal } from '@/components/shared/AssetSelectModal'
import { TokenSelectButton } from '@/components/shared/TokenSelectButton'
import { TokenIcon } from '@/components/shared/TokenIcon'

interface TokenAmountCardProps {
    label: string
    asset: Asset
    excludeSymbol: string
    onSelect: (asset: Asset) => void
    amount: string
    onAmountChange: (value: string) => void
    onFocus?: () => void
    balance?: { value: bigint; decimals: number }

    locked?: boolean
}

export const TokenAmountCard: React.FC<TokenAmountCardProps> = ({
    label,
    asset,
    excludeSymbol,
    onSelect,
    amount,
    onAmountChange,
    onFocus,
    balance,
    locked,
}) => (
    <div onClick={onFocus} className="rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] card cursor-text">
        <span className="text-gray-400 text-xs md:text-[0.9vw] font-medium block mb-1">{label}</span>
        <div className="flex items-center justify-between gap-2">
            <input
                type="text"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                onFocus={onFocus}
                placeholder="0.0"
                className="bg-transparent text-3xl md:text-[2.8vw] font-bold outline-none w-[55%] tracking-tight leading-none text-white placeholder-gray-600"
            />
            {locked ? (
                <div className="flex items-center gap-2 md:gap-[0.5vw] card-light rounded-full py-1.5 md:py-[0.4vw] px-3 md:px-[0.9vw] backdrop-blur-md shrink-0">
                    <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                        <TokenIcon symbol={asset.symbol} imageUrl={asset.logoUrl} className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw]" />
                    </div>
                    <span className="text-sm md:text-[1.1vw] font-[600] text-white tracking-tight">{asset.symbol}</span>
                </div>
            ) : (
                <AssetSelectModal
                    assets={ASSETS}
                    excludeSymbol={excludeSymbol}
                    onSelect={onSelect}
                    trigger={<TokenSelectButton symbol={asset.symbol} imageUrl={asset.logoUrl} />}
                />
            )}
        </div>
        {balance && (
            <span className="text-gray-500 text-xs md:text-[0.8vw]">
                Balance: {Number(formatUnits(balance.value, balance.decimals)).toFixed(4)}
            </span>
        )}
    </div>
)
