import React from 'react'
import { formatUnits } from 'viem'
import { ASSETS, type Asset } from '@/lib/contracts'
import { truncateDisplayAmount } from '@/lib/format'
import { AssetSelectModal } from '@/components/shared/AssetSelectModal'
import { TokenSelectButton } from '@/components/shared/TokenSelectButton'

const MAX_AMOUNT_LENGTH = 16

interface TokenInputCardProps {
    variant: 'sell' | 'buy'
    label: string
    isActive: boolean
    value: string
    onChange: (value: string) => void
    onFocus: () => void
    asset: Asset
    excludeSymbol: string
    onSelect: (asset: Asset) => void
    balance?: { value: bigint; decimals: number }
}

export const TokenInputCard: React.FC<TokenInputCardProps> = ({
    variant,
    label,
    isActive,
    value,
    onChange,
    onFocus,
    asset,
    excludeSymbol,
    onSelect,
    balance,
}) => (
    <div
        onClick={onFocus}
        className={`rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] transition-all duration-300 cursor-text relative ${variant === 'buy' ? 'mt-1 md:mt-[0.2vw] ' : ''}${isActive
                ? 'card-dark border border-blue-500/50 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                : 'card border border-transparent'
            }`}
    >
        <div className="flex items-center justify-between mb-1 md:mb-[0.1vw]">
            <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium">{label}</span>
        </div>

        <div className="flex items-center justify-between gap-2 min-h-[40px] md:min-h-[3.2vw]">
            <div className="flex items-center w-[55%]">
                <input
                    type="text"
                    value={isActive ? value : truncateDisplayAmount(value)}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={onFocus}
                    placeholder="0.0"
                    maxLength={MAX_AMOUNT_LENGTH}
                    className={`bg-transparent text-3xl md:text-[2.8vw] font-bold outline-none w-full tracking-tight leading-none transition-colors placeholder-gray-600 ${isActive ? 'text-white' : 'text-gray-500'
                        }`}
                />
            </div>

            <AssetSelectModal
                assets={ASSETS}
                excludeSymbol={excludeSymbol}
                onSelect={onSelect}
                trigger={<TokenSelectButton symbol={asset.symbol} />}
            />
        </div>

        {balance && (
            <span className="text-gray-500 text-xs md:text-[0.8vw]">
                Balance: {Number(formatUnits(balance.value, balance.decimals)).toFixed(4)}
            </span>
        )}
    </div>
)
