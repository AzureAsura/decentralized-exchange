'use client'

import React from 'react'
import { TxFlowModal } from '@/components/shared/TxFlowModal'
import { TxFlowAnimation, type TxFlowStatus } from '@/components/shared/TxFlowAnimation'

interface ApproveStatusModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    symbol: string
    status: TxFlowStatus
    onRetry: () => void
}

// Popup status approve — dibuka programatik dari SwapCard (open/onOpenChange terkontrol dari luar,
// bukan useState lokal). Dikunci selama status 'sending' lewat TxFlowModal.
export const ApproveStatusModal: React.FC<ApproveStatusModalProps> = ({ open, onOpenChange, symbol, status, onRetry }) => (
    <TxFlowModal open={open} onOpenChange={onOpenChange} locked={status === 'sending'} title={`Approve ${symbol}`}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
            <TxFlowAnimation status={status} />
            {status === 'sending' && <p className="text-white font-medium">Approving {symbol}...</p>}
            {status === 'success' && <p className="text-emerald-400 font-semibold">Approved!</p>}
            {status === 'error' && (
                <>
                    <p className="text-red-400 font-medium">Approval failed or was rejected</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="btn-color text-white font-semibold px-6 py-2 rounded-xl transition-all active:scale-95"
                    >
                        Try Again
                    </button>
                </>
            )}
        </div>
    </TxFlowModal>
)
