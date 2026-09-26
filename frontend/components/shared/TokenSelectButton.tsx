import React from 'react'
import { ChevronDown } from 'lucide-react'
import { TokenIcon } from '@/components/shared/TokenIcon'

interface TokenSelectButtonProps {
    symbol: string
}

// Trigger button dipakai AssetSelectModal — dulu ditulis ulang di tiap tempat (sell/buy card, TokenAmountCard).
export const TokenSelectButton: React.FC<TokenSelectButtonProps> = ({ symbol }) => (
    <button className="flex items-center gap-2 md:gap-[0.5vw] card-light rounded-full py-1.5 md:py-[0.4vw] px-3 md:px-[0.9vw] backdrop-blur-md transition-all duration-150 active:scale-95 shrink-0">
        <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
            <TokenIcon symbol={symbol} className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw]" />
        </div>
        <span className="text-sm md:text-[1.1vw] font-[600] text-white tracking-tight">{symbol}</span>
        <ChevronDown className="w-3 h-3 md:w-[0.85vw] md:h-[0.85vw] text-gray-400 stroke-[3.5]" />
    </button>
)
