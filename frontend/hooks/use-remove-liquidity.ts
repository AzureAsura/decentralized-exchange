'use client'

import { useRef, useState } from 'react'
import { erc20Abi, parseSignature } from 'viem'
import { useAccount, useChainId, useReadContract, useSignTypedData } from 'wagmi'
import { ROUTER_ADDRESS, WBNB_ADDRESS, pairAbi, routerAbi, type Asset } from '@/lib/contracts'
import { applySlippageMin } from '@/lib/swap'
import { useAllowance } from '@/hooks/use-allowance'
import { usePairPosition } from '@/hooks/use-pair-position'
import { useSettings } from '@/hooks/use-settings'
import { useTransaction } from '@/hooks/use-transaction'

const isWBNB = (tokenAddress: `0x${string}` | undefined) => tokenAddress?.toLowerCase() === WBNB_ADDRESS.toLowerCase()

export type RemovePhase = 'review' | 'sending' | 'success' | 'error'

export function useRemoveLiquidity(pairAddress: `0x${string}` | undefined) {
    const { address } = useAccount()
    const chainId = useChainId()
    const { slippageBps, deadlineMinutes } = useSettings()

    const position = usePairPosition(pairAddress)
    const { token0, token1, symbol0, symbol1, pooled0, pooled1, userLpBalance, refetchPosition } = position

    const [removePercent, setRemovePercent] = useState(0)
    // Ditaruh dulu sebelum approve classic-fallback ditembak, dipakai lagi begitu approve sukses
    // buat lanjut remove otomatis — bukan minta user klik Confirm dua kali.
    const pendingDeadlineRef = useRef<bigint | null>(null)

    const liquidity = userLpBalance !== undefined ? (userLpBalance * BigInt(removePercent)) / BigInt(100) : BigInt(0)
    const receive0 = (pooled0 * BigInt(removePercent)) / BigInt(100)
    const receive1 = (pooled1 * BigInt(removePercent)) / BigInt(100)

    const slippageBpsBig = BigInt(slippageBps)
    const amount0Min = applySlippageMin(receive0, slippageBpsBig)
    const amount1Min = applySlippageMin(receive1, slippageBpsBig)

    const isETHPair = isWBNB(token0) || isWBNB(token1)

    // LP token direpresentasiin sebagai Asset ad-hoc biar bisa reuse useAllowance yang generic.
    const lpAsset: Asset = { symbol: 'LP', name: 'Nirmala LP', address: pairAddress ?? null }
    const allowance = useAllowance(lpAsset, address, liquidity > BigInt(0) ? liquidity : undefined)

    const { data: nonce } = useReadContract({
        address: pairAddress,
        abi: pairAbi,
        functionName: 'nonces',
        args: address ? [address] : undefined,
        query: { enabled: Boolean(pairAddress && address) },
    })

    const { mutateAsync: signPermitAsync, isPending: isSigning } = useSignTypedData()

    const buildPermitRemoveRequest = (v: number, r: `0x${string}`, s: `0x${string}`, deadline: bigint) => {
        if (!pairAddress || !token0 || !token1 || !address) return undefined
        if (isETHPair) {
            const token = isWBNB(token0) ? token1 : token0
            const [tokenMin, ethMin] = isWBNB(token0) ? [amount1Min, amount0Min] : [amount0Min, amount1Min]
            return {
                address: ROUTER_ADDRESS,
                abi: routerAbi,
                functionName: 'removeLiquidityETHWithPermit',
                args: [token, liquidity, tokenMin, ethMin, address, deadline, false, v, r, s],
            } as const
        }
        return {
            address: ROUTER_ADDRESS,
            abi: routerAbi,
            functionName: 'removeLiquidityWithPermit',
            args: [token0, token1, liquidity, amount0Min, amount1Min, address, deadline, false, v, r, s],
        } as const
    }

    const buildClassicRemoveRequest = (deadline: bigint) => {
        if (!pairAddress || !token0 || !token1 || !address) return undefined
        if (isETHPair) {
            const token = isWBNB(token0) ? token1 : token0
            const [tokenMin, ethMin] = isWBNB(token0) ? [amount1Min, amount0Min] : [amount0Min, amount1Min]
            return {
                address: ROUTER_ADDRESS,
                abi: routerAbi,
                functionName: 'removeLiquidityETH',
                args: [token, liquidity, tokenMin, ethMin, address, deadline],
            } as const
        }
        return {
            address: ROUTER_ADDRESS,
            abi: routerAbi,
            functionName: 'removeLiquidity',
            args: [token0, token1, liquidity, amount0Min, amount1Min, address, deadline],
        } as const
    }

    const removeTx = useTransaction(
        'remove',
        {
            walletMessage: 'Confirm removal in your wallet...',
            confirmingMessage: 'Removing liquidity...',
            successMessage: 'Liquidity removed!',
            errorMessage: 'Remove failed or was rejected',
        },
        () => refetchPosition()
    )

    const approveTx = useTransaction(
        'remove-approve',
        {
            walletMessage: 'Confirm the approval in your wallet...',
            confirmingMessage: 'Approving LP token...',
            successMessage: 'Approved',
            errorMessage: 'Approval failed or was rejected',
        },
        () => {
            allowance.refetch()
            const deadline = pendingDeadlineRef.current
            pendingDeadlineRef.current = null
            if (deadline) {
                const request = buildClassicRemoveRequest(deadline)
                if (request) removeTx.send(request)
            }
        }
    )

    // Jalur utama: 1 tanda tangan EIP-2612, langsung 1 tx removeLiquidity*WithPermit.
    // Kalau user nolak/gagal tanda tangan: fallback approve (kalau perlu) + remove klasik (2 tx) —
    // kontrak sendiri (_permit()) udah nanganin kasus permit KE-SUBMIT tapi revert (mis. signature
    // kepakai duluan), jadi frontend cuma perlu nangani penolakan tanda tangan di sisi wallet.
    const handleConfirmRemove = async () => {
        if (!pairAddress || !address || nonce === undefined || liquidity <= BigInt(0)) return
        const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60)

        try {
            const signature = await signPermitAsync({
                domain: {
                    name: 'Nirmala LP',
                    version: '1',
                    chainId,
                    verifyingContract: pairAddress,
                },
                types: {
                    Permit: [
                        { name: 'owner', type: 'address' },
                        { name: 'spender', type: 'address' },
                        { name: 'value', type: 'uint256' },
                        { name: 'nonce', type: 'uint256' },
                        { name: 'deadline', type: 'uint256' },
                    ],
                },
                primaryType: 'Permit',
                message: {
                    owner: address,
                    spender: ROUTER_ADDRESS,
                    value: liquidity,
                    nonce,
                    deadline,
                },
            })
            // yParity selalu ada (0/1) walau `v` kadang undefined tergantung wallet — 27+yParity
            // selalu setara v yang benar, jadi dipakai langsung daripada gantung ke field `v`.
            const { r, s, yParity } = parseSignature(signature)
            const request = buildPermitRemoveRequest(27 + yParity, r, s, deadline)
            if (!request) return
            removeTx.send(request)
        } catch {
            if (allowance.needsApproval) {
                pendingDeadlineRef.current = deadline
                approveTx.send({ address: pairAddress, abi: erc20Abi, functionName: 'approve', args: [ROUTER_ADDRESS, liquidity] })
            } else {
                const request = buildClassicRemoveRequest(deadline)
                if (request) removeTx.send(request)
            }
        }
    }

    // Dipanggil pas modal DIBUKA — cuma bersihin status tx lama, JANGAN sentuh removePercent
    // (itu pilihan user yang lagi mau di-eksekusi, bukan sesuatu yang harus di-reset di sini).
    const resetTxState = () => {
        approveTx.reset()
        removeTx.reset()
    }

    // Dipanggil pas modal DITUTUP setelah sukses — form beneran balik ke awal.
    const resetAfterSuccess = () => {
        setRemovePercent(0)
        approveTx.reset()
        removeTx.reset()
    }

    const phase: RemovePhase = removeTx.error || approveTx.error
        ? 'error'
        : removeTx.isSuccess
            ? 'success'
            : isSigning || approveTx.isPending || approveTx.isConfirming || removeTx.isPending || removeTx.isConfirming
                ? 'sending'
                : 'review'

    const sendingLabel = isSigning
        ? 'Sign the permit in your wallet...'
        : approveTx.isPending
            ? 'Confirm the approval in your wallet...'
            : approveTx.isConfirming
                ? 'Approving LP token...'
                : removeTx.isPending
                    ? 'Confirm removal in your wallet...'
                    : 'Removing liquidity...'

    return {
        symbol0,
        symbol1,
        removePercent,
        setRemovePercent,
        receive0,
        receive1,
        hasPosition: userLpBalance !== undefined && userLpBalance > BigInt(0),
        phase,
        sendingLabel,
        hash: removeTx.hash,
        handleConfirmRemove,
        resetTxState,
        resetAfterSuccess,
    }
}
