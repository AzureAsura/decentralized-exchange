'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { erc20Abi, formatUnits } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { ASSETS, NATIVE_BNB, ROUTER_ADDRESS, TEST_TOKENS, routerAbi, type Asset } from '@/lib/contracts'
import { safeParseEther } from '@/lib/format'
import { applySlippageMin, resolvePathAddress } from '@/lib/swap'
import { useAllowance } from '@/hooks/use-allowance'
import { useAssetBalance } from '@/hooks/use-asset-balance'
import { usePairReserves } from '@/hooks/use-pair-reserves'
import { useSettings } from '@/hooks/use-settings'
import { useTransaction } from '@/hooks/use-transaction'

export function useAddLiquidity() {
    const { address } = useAccount()
    const { slippageBps, deadlineMinutes } = useSettings()

    const [tokenA, setTokenA] = useState<Asset>(NATIVE_BNB)
    const [tokenB, setTokenB] = useState<Asset>(TEST_TOKENS[0])
    // Kalau pair BELUM ada: dua-duanya independen (persis behavior lama, user bebas nentuin rasio/harga awal).
    // Kalau pair SUDAH ada: activeSide nentuin sisi mana yang "sumber", sisi lain di-derive dari quote() —
    // sama pola dengan use-swap.ts, bisa di-override manual begitu user fokus ke sisi yang di-derive.
    const [amountAInput, setAmountAInput] = useState('')
    const [amountBInput, setAmountBInput] = useState('')
    const [activeSide, setActiveSide] = useState<'a' | 'b'>('a')

    const tokenABalance = useAssetBalance(tokenA, address)
    const tokenBBalance = useAssetBalance(tokenB, address)

    const { exists: pairExists, reserveA, reserveB } = usePairReserves(
        resolvePathAddress(tokenA),
        resolvePathAddress(tokenB)
    )

    const typedAmountA = safeParseEther(amountAInput)
    const typedAmountB = safeParseEther(amountBInput)

    const { data: quotedB } = useReadContract({
        address: ROUTER_ADDRESS,
        abi: routerAbi,
        functionName: 'quote',
        args:
            typedAmountA !== undefined && reserveA !== undefined && reserveB !== undefined
                ? [typedAmountA, reserveA, reserveB]
                : undefined,
        query: {
            enabled: pairExists && activeSide === 'a' && typedAmountA !== undefined && typedAmountA > BigInt(0),
            retry: false,
            placeholderData: keepPreviousData,
        },
    })

    const { data: quotedA } = useReadContract({
        address: ROUTER_ADDRESS,
        abi: routerAbi,
        functionName: 'quote',
        args:
            typedAmountB !== undefined && reserveA !== undefined && reserveB !== undefined
                ? [typedAmountB, reserveB, reserveA]
                : undefined,
        query: {
            enabled: pairExists && activeSide === 'b' && typedAmountB !== undefined && typedAmountB > BigInt(0),
            retry: false,
            placeholderData: keepPreviousData,
        },
    })

    const parsedAmountA = !pairExists ? typedAmountA : activeSide === 'a' ? typedAmountA : quotedA
    const parsedAmountB = !pairExists ? typedAmountB : activeSide === 'b' ? typedAmountB : quotedB

    const amountADisplay =
        !pairExists || activeSide === 'a' ? amountAInput : quotedA !== undefined ? formatUnits(quotedA, 18) : ''
    const amountBDisplay =
        !pairExists || activeSide === 'b' ? amountBInput : quotedB !== undefined ? formatUnits(quotedB, 18) : ''

    const hasValidAmounts = parsedAmountA !== undefined && parsedAmountB !== undefined

    const isInsufficientBalanceA =
        parsedAmountA !== undefined && tokenABalance !== undefined && parsedAmountA > tokenABalance.value
    const isInsufficientBalanceB =
        parsedAmountB !== undefined && tokenBBalance !== undefined && parsedAmountB > tokenBBalance.value
    const isInsufficientBalance = isInsufficientBalanceA || isInsufficientBalanceB

    const slippageBpsBig = BigInt(slippageBps)
    // First-deposit (pair belum ada): amountMin = 0, nggak ada rasio yang bisa dilindungi —
    // itu yang justru dipakai user buat nentuin harga awal pool.
    const amountAMin = pairExists && parsedAmountA !== undefined ? applySlippageMin(parsedAmountA, slippageBpsBig) : BigInt(0)
    const amountBMin = pairExists && parsedAmountB !== undefined ? applySlippageMin(parsedAmountB, slippageBpsBig) : BigInt(0)

    const isNativePair = tokenA.address === null || tokenB.address === null

    const allowanceA = useAllowance(tokenA, address, parsedAmountA)
    const allowanceB = useAllowance(tokenB, address, parsedAmountB)

    const approveTx = useTransaction(
        'approve',
        {
            walletMessage: 'Confirm the approval in your wallet...',
            confirmingMessage: 'Approving...',
            successMessage: 'Approved',
            errorMessage: 'Approval failed or was rejected',
        },
        () => {
            allowanceA.refetch()
            allowanceB.refetch()
        }
    )

    const supplyTx = useTransaction('supply', {
        walletMessage: 'Confirm the supply in your wallet...',
        confirmingMessage: 'Adding liquidity...',
        successMessage: 'Liquidity added!',
        errorMessage: 'Supply failed or was rejected',
    })

    // Pindah sisi aktif TANPA nge-blank-in angka yang lagi ditampilin — sama pola use-swap.ts.
    // Kalau pair belum ada, dua sisi udah independen dari awal, nggak perlu switch apa-apa.
    const handleFocusA = () => {
        if (pairExists && activeSide !== 'a') {
            setAmountAInput(amountADisplay)
            setActiveSide('a')
        }
    }

    const handleFocusB = () => {
        if (pairExists && activeSide !== 'b') {
            setAmountBInput(amountBDisplay)
            setActiveSide('b')
        }
    }

    const handleSelectTokenA = (asset: Asset) => {
        setTokenA(asset)
        if (tokenB.symbol === asset.symbol) setTokenB(ASSETS.find((a) => a.symbol !== asset.symbol) ?? TEST_TOKENS[0])
    }

    const handleSelectTokenB = (asset: Asset) => {
        setTokenB(asset)
        if (tokenA.symbol === asset.symbol) setTokenA(ASSETS.find((a) => a.symbol !== asset.symbol) ?? NATIVE_BNB)
    }

    const handleApprove = (asset: Asset, amount: bigint) => {
        if (!asset.address) return
        approveTx.send({ address: asset.address, abi: erc20Abi, functionName: 'approve', args: [ROUTER_ADDRESS, amount] })
    }

    const handleSupply = () => {
        if (!address || parsedAmountA === undefined || parsedAmountB === undefined) return
        const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60)

        if (isNativePair) {
            const [ercAsset, ercAmount, ercAmountMin, ethAmount, ethAmountMin] =
                tokenA.address === null
                    ? [tokenB, parsedAmountB, amountBMin, parsedAmountA, amountAMin]
                    : [tokenA, parsedAmountA, amountAMin, parsedAmountB, amountBMin]
            if (!ercAsset.address) return
            supplyTx.send({
                address: ROUTER_ADDRESS,
                abi: routerAbi,
                functionName: 'addLiquidityETH',
                args: [ercAsset.address, ercAmount as bigint, ercAmountMin as bigint, ethAmountMin as bigint, address, deadline],
                value: ethAmount as bigint,
            })
        } else {
            if (!tokenA.address || !tokenB.address) return
            supplyTx.send({
                address: ROUTER_ADDRESS,
                abi: routerAbi,
                functionName: 'addLiquidity',
                args: [tokenA.address, tokenB.address, parsedAmountA, parsedAmountB, amountAMin, amountBMin, address, deadline],
            })
        }
    }

    // Dipanggil pas popup sukses ditutup — sama pola resetSwapForm di use-swap.ts.
    const resetSupplyForm = () => {
        setAmountAInput('')
        setAmountBInput('')
        setActiveSide('a')
        supplyTx.reset()
    }

    return {
        tokenA,
        tokenB,
        amountADisplay,
        amountBDisplay,
        activeSide,
        tokenABalance,
        tokenBBalance,
        pairExists,
        reserveA,
        reserveB,
        setAmountAInput,
        setAmountBInput,
        handleFocusA,
        handleFocusB,
        handleSelectTokenA,
        handleSelectTokenB,
        handleApprove,
        handleSupply,
        resetSupplyForm,
        hasValidAmounts,
        isInsufficientBalanceA,
        isInsufficientBalanceB,
        isInsufficientBalance,
        amountAMin,
        amountBMin,
        slippageBps,
        needsApprovalA: allowanceA.needsApproval,
        needsApprovalB: allowanceB.needsApproval,
        parsedAmountA,
        parsedAmountB,
        approveTx,
        supplyTx,
    }
}
