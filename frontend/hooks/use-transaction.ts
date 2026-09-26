'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useConfig } from 'wagmi'
import { waitForTransactionReceipt, writeContract, type WriteContractParameters } from 'wagmi/actions'

type Stage = 'idle' | 'wallet' | 'confirming'

export interface UseTransactionMessages {
    walletMessage: string
    confirmingMessage: string
    successMessage: string
    errorMessage: string
}

export function useTransaction(toastId: string, messages: UseTransactionMessages, onSuccess?: () => void) {
    const config = useConfig()
    const [stage, setStage] = useState<Stage>('idle')

    const mutation = useMutation({
        mutationFn: async (request: WriteContractParameters) => {
            setStage('wallet')
            toast.loading(messages.walletMessage, { id: toastId })
            const hash = await writeContract(config, request)
            setStage('confirming')
            toast.loading(messages.confirmingMessage, { id: toastId })
            await waitForTransactionReceipt(config, { hash })
            return hash
        },
        onSuccess: () => {
            toast.success(messages.successMessage, { id: toastId })
            onSuccess?.()
        },
        onError: () => {
            toast.error(messages.errorMessage, { id: toastId })
        },
        onSettled: () => {
            setStage('idle')
        },
    })

    return {
        send: mutation.mutate,
        isPending: stage === 'wallet',
        isConfirming: stage === 'confirming',
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    }
}
