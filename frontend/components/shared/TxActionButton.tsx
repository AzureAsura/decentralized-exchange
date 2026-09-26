import React from 'react'
import { ConnectWalletModal } from '@/components/shared/ConnectWalletModal'

interface ApprovalStep {
    needsApproval: boolean
    label: string
    disabled: boolean
    isPending: boolean
    isConfirming: boolean
    onApprove: () => void
}

interface SubmitAction {
    disabled: boolean
    isPending: boolean
    isConfirming: boolean
    confirmingLabel: string
    idleLabel: string
    onSubmit: () => void
}

interface TxActionButtonProps {
    // Bagian yang beda persis antar halaman (ukuran font/radius trade vs liquidity/new) — bukan disatuin,
    // dijaga lewat prop supaya tampilannya identik dengan sebelum refactor.
    sizeClassName: string
    isConnected: boolean
    isWrongNetwork: boolean
    isSwitching: boolean
    onSwitchNetwork: () => void
    isSuccess: boolean
    successContent: React.ReactNode
    approvalSteps: ApprovalStep[]
    submit: SubmitAction
}

// Rantai tombol Connect Wallet -> Switch Network -> Approve (tiap step, urut) -> Submit,
// dipakai persis sama di /trade dan /liquidity/new (dulu ditulis 2x).
export const TxActionButton: React.FC<TxActionButtonProps> = ({
    sizeClassName,
    isConnected,
    isWrongNetwork,
    isSwitching,
    onSwitchNetwork,
    isSuccess,
    successContent,
    approvalSteps,
    submit,
}) => {
    if (isSuccess) return <>{successContent}</>

    if (!isConnected) {
        return (
            <ConnectWalletModal
                trigger={
                    <button
                        type="button"
                        className={`btn-color w-full text-white font-semibold ${sizeClassName} transition-all active:scale-[0.99]`}
                    >
                        Connect Wallet
                    </button>
                }
            />
        )
    }

    if (isWrongNetwork) {
        return (
            <button
                type="button"
                disabled={isSwitching}
                onClick={onSwitchNetwork}
                className={`w-full text-red-400 bg-red-500/10 border border-red-500/40 font-semibold ${sizeClassName} transition-all active:scale-[0.99] disabled:opacity-60`}
            >
                {isSwitching ? 'Switching...' : 'Switch to BNB Testnet'}
            </button>
        )
    }

    const activeApproval = approvalSteps.find((step) => step.needsApproval)
    if (activeApproval) {
        return (
            <button
                type="button"
                disabled={activeApproval.disabled || activeApproval.isPending || activeApproval.isConfirming}
                onClick={activeApproval.onApprove}
                className={`btn-color w-full text-white font-semibold ${sizeClassName} transition-all active:scale-[0.99] disabled:opacity-40`}
            >
                {activeApproval.isPending ? 'Confirm in wallet...' : activeApproval.isConfirming ? 'Approving...' : activeApproval.label}
            </button>
        )
    }

    return (
        <button
            type="button"
            disabled={submit.disabled || submit.isPending || submit.isConfirming}
            onClick={submit.onSubmit}
            className={`btn-color w-full text-white font-semibold ${sizeClassName} transition-all active:scale-[0.99] disabled:opacity-40`}
        >
            {submit.isPending ? 'Confirm in wallet...' : submit.isConfirming ? submit.confirmingLabel : submit.idleLabel}
        </button>
    )
}
