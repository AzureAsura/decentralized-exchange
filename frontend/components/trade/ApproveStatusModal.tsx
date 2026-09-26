'use client'

import React from 'react'
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
import { TxFlowAnimation, type TxFlowStatus } from '@/components/trade/TxFlowAnimation'

interface ApproveStatusModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    symbol: string
    status: TxFlowStatus
    onRetry: () => void
}

const ApproveStatusBody: React.FC<Omit<ApproveStatusModalProps, 'open' | 'onOpenChange'>> = ({ symbol, status, onRetry }) => (
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
)

// Popup status approve — dibuka programatik dari SwapCard (open/onOpenChange terkontrol dari luar,
// bukan useState lokal), dikunci (X disembunyikan, backdrop/escape diabaikan) selama status 'sending'.
export const ApproveStatusModal: React.FC<ApproveStatusModalProps> = ({ open, onOpenChange, symbol, status, onRetry }) => {
    const isDesktop = useMediaQuery('(min-width: 768px)')
    const isLocked = status === 'sending'

    const handleOpenChange = (next: boolean) => {
        if (isLocked) return
        onOpenChange(next)
    }

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    showCloseButton={!isLocked}
                    className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white max-w-[28vw] min-w-[360px] rounded-[1.8vw] p-[1.5vw] shadow-2xl"
                >
                    <DialogHeader className="pb-1">
                        <DialogTitle className="text-lg font-semibold text-white tracking-tight">
                            Approve {symbol}
                        </DialogTitle>
                    </DialogHeader>
                    <ApproveStatusBody symbol={symbol} status={status} onRetry={onRetry} />
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white rounded-t-[28px] px-5 pb-8 pt-3">
                <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20 mb-4" />
                <DrawerHeader className="p-0 pb-2 text-left">
                    <DrawerTitle className="text-xl font-semibold text-white">Approve {symbol}</DrawerTitle>
                </DrawerHeader>
                <ApproveStatusBody symbol={symbol} status={status} onRetry={onRetry} />
            </DrawerContent>
        </Drawer>
    )
}
