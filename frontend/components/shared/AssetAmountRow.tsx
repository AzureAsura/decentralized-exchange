import React from 'react'
import type { Asset } from '@/lib/contracts'
import { truncateDisplayAmount } from '@/lib/format'
import { TokenIcon } from '@/components/shared/TokenIcon'

interface AssetAmountRowProps {
    asset: Asset
    amount: string
}

// Baris "icon + jumlah (dipotong 6 desimal) + simbol" dipakai di popup review/success
// Swap, Add Liquidity, dan Remove Liquidity — supaya nggak ditulis ulang di tiap modal.
export const AssetAmountRow: React.FC<AssetAmountRowProps> = ({ asset, amount }) => (
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
