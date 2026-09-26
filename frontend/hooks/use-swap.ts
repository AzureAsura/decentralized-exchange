'use client'

import { useMemo, useState } from 'react'
import { erc20Abi, formatUnits } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { ASSETS, ROUTER_ADDRESS, routerAbi, type Asset } from '@/lib/contracts'
import { safeParseEther } from '@/lib/format'
import { applySlippageMax, applySlippageMin, buildSwapRequest, resolvePathAddress } from '@/lib/swap'
import { useAllowance } from '@/hooks/use-allowance'
import { useAssetBalance } from '@/hooks/use-asset-balance'
import { usePairReserves } from '@/hooks/use-pair-reserves'
import { useSettings } from '@/hooks/use-settings'
import { useTransaction } from '@/hooks/use-transaction'

export function useSwap() {
    const { address } = useAccount()
    const { slippageBps, deadlineMinutes } = useSettings()

    const [sellAsset, setSellAsset] = useState<Asset>(ASSETS[0])
    const [buyAsset, setBuyAsset] = useState<Asset>(ASSETS[1])
    // Raw teks yang diketik user — cuma "berlaku" buat sisi yang lagi aktif (activeSide).
    // Sisi yang nggak aktif nilainya DIDERIVE dari hasil quote, bukan di-setState via effect.
    const [sellInput, setSellInput] = useState('')
    const [buyInput, setBuyInput] = useState('')
    const [activeSide, setActiveSide] = useState<'sell' | 'buy'>('sell')

    const path = useMemo(
        () => [resolvePathAddress(sellAsset), resolvePathAddress(buyAsset)] as const,
        [sellAsset, buyAsset]
    )

    const typedSellAmount = activeSide === 'sell' ? safeParseEther(sellInput) : undefined
    const typedBuyAmount = activeSide === 'buy' ? safeParseEther(buyInput) : undefined

    const sellBalance = useAssetBalance(sellAsset, address)
    const buyBalance = useAssetBalance(buyAsset, address)

    // Quote — exact-in (jual) pakai getAmountsOut, exact-out (beli) pakai getAmountsIn
    const {
        data: amountsOut,
        isFetching: isQuotingOut,
        error: amountsOutError,
    } = useReadContract({
        address: ROUTER_ADDRESS,
        abi: routerAbi,
        functionName: 'getAmountsOut',
        args: typedSellAmount !== undefined ? [typedSellAmount, path] : undefined,
        query: { enabled: activeSide === 'sell' && typedSellAmount !== undefined, retry: false },
    })

    const {
        data: amountsIn,
        isFetching: isQuotingIn,
        error: amountsInError,
    } = useReadContract({
        address: ROUTER_ADDRESS,
        abi: routerAbi,
        functionName: 'getAmountsIn',
        args: typedBuyAmount !== undefined ? [typedBuyAmount, path] : undefined,
        query: { enabled: activeSide === 'buy' && typedBuyAmount !== undefined, retry: false },
    })

    const quoteError = activeSide === 'sell' ? amountsOutError : amountsInError

    // Amount efektif dipakai di seluruh kalkulasi di bawah (approval/swap/price impact) —
    // sisi aktif dari input langsung, sisi pasif diderive dari quote. Nggak ada effect sama sekali.
    const derivedBuyAmount = activeSide === 'sell' ? amountsOut?.[amountsOut.length - 1] : undefined
    const derivedSellAmount = activeSide === 'buy' ? amountsIn?.[0] : undefined
    const parsedSellAmount = activeSide === 'sell' ? typedSellAmount : derivedSellAmount
    const parsedBuyAmount = activeSide === 'buy' ? typedBuyAmount : derivedBuyAmount

    const sellDisplay = activeSide === 'sell' ? sellInput : derivedSellAmount !== undefined ? formatUnits(derivedSellAmount, 18) : ''
    const buyDisplay = activeSide === 'buy' ? buyInput : derivedBuyAmount !== undefined ? formatUnits(derivedBuyAmount, 18) : ''

    const slippageBpsBig = BigInt(slippageBps)
    const amountOutMin =
        activeSide === 'sell' && amountsOut ? applySlippageMin(amountsOut[amountsOut.length - 1], slippageBpsBig) : undefined
    const amountInMax =
        activeSide === 'buy' && amountsIn ? applySlippageMax(amountsIn[0], slippageBpsBig) : undefined

    const requiredApprovalAmount = activeSide === 'sell' ? parsedSellAmount : amountInMax

    const allowance = useAllowance(sellAsset, address, requiredApprovalAmount)

    const approveTx = useTransaction(
        'approve',
        {
            walletMessage: 'Confirm the approval in your wallet...',
            confirmingMessage: 'Approving...',
            successMessage: 'Approved',
            errorMessage: 'Approval failed or was rejected',
        },
        () => allowance.refetch()
    )

    const swapTx = useTransaction('swap', {
        walletMessage: 'Confirm the swap in your wallet...',
        confirmingMessage: 'Swapping...',
        successMessage: 'Swap complete!',
        errorMessage: 'Swap failed or was rejected',
    })

    // Price impact — dibandingin ke spot price reserve, bukan cuma tampilan statis
    const { exists: pairExists, reserveA, reserveB } = usePairReserves(path[0], path[1])
    const effectiveAmountIn = activeSide === 'sell' ? parsedSellAmount : amountsIn?.[0]
    const effectiveAmountOut = activeSide === 'sell' ? amountsOut?.[amountsOut.length - 1] : parsedBuyAmount

    const priceImpact = useMemo(() => {
        if (!pairExists || reserveA === undefined || reserveB === undefined) return undefined
        if (effectiveAmountIn === undefined || effectiveAmountOut === undefined || effectiveAmountIn === BigInt(0)) return undefined
        const spotPrice = Number(formatUnits(reserveB, 18)) / Number(formatUnits(reserveA, 18))
        const executionPrice = Number(formatUnits(effectiveAmountOut, 18)) / Number(formatUnits(effectiveAmountIn, 18))
        if (spotPrice === 0) return undefined
        return ((spotPrice - executionPrice) / spotPrice) * 100
    }, [pairExists, reserveA, reserveB, effectiveAmountIn, effectiveAmountOut])

    const hasEnteredValues = parsedSellAmount !== undefined && parsedBuyAmount !== undefined

    // Pindah sisi aktif TANPA nge-blank-in angka yang lagi ditampilin —
    // "bawa" nilai yang lagi kelihatan jadi input awal sisi yang baru diklik.
    const handleFocusSell = () => {
        if (activeSide !== 'sell') {
            setSellInput(sellDisplay)
            setActiveSide('sell')
        }
    }

    const handleFocusBuy = () => {
        if (activeSide !== 'buy') {
            setBuyInput(buyDisplay)
            setActiveSide('buy')
        }
    }

    const handleSwapDirection = () => {
        const nextSellInput = buyDisplay
        const nextBuyInput = sellDisplay
        setSellAsset(buyAsset)
        setBuyAsset(sellAsset)
        setSellInput(nextSellInput)
        setBuyInput(nextBuyInput)
    }

    const handleSelectSellAsset = (asset: Asset) => {
        setSellAsset(asset)
        if (buyAsset.symbol === asset.symbol) setBuyAsset(ASSETS.find((a) => a.symbol !== asset.symbol) ?? ASSETS[0])
    }

    const handleSelectBuyAsset = (asset: Asset) => {
        setBuyAsset(asset)
        if (sellAsset.symbol === asset.symbol) setSellAsset(ASSETS.find((a) => a.symbol !== asset.symbol) ?? ASSETS[0])
    }

    const handleApprove = () => {
        if (!sellAsset.address || requiredApprovalAmount === undefined) return
        approveTx.send({ address: sellAsset.address, abi: erc20Abi, functionName: 'approve', args: [ROUTER_ADDRESS, requiredApprovalAmount] })
    }

    const handleSwap = () => {
        if (!address) return
        const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60)
        const request = buildSwapRequest({
            activeSide,
            sellAsset,
            buyAsset,
            path,
            to: address,
            deadline,
            amountOutMin,
            amountInMax,
            parsedSellAmount,
            parsedBuyAmount,
        })
        if (!request) return
        swapTx.send(request)
    }

    const isQuoting = activeSide === 'sell' ? isQuotingOut : isQuotingIn
    const rate =
        parsedSellAmount && parsedBuyAmount && parsedSellAmount > BigInt(0)
            ? Number(formatUnits(parsedBuyAmount, 18)) / Number(formatUnits(parsedSellAmount, 18))
            : undefined

    return {
        sellAsset,
        buyAsset,
        sellDisplay,
        buyDisplay,
        activeSide,
        sellBalance,
        buyBalance,
        setSellInput,
        setBuyInput,
        handleFocusSell,
        handleFocusBuy,
        handleSwapDirection,
        handleSelectSellAsset,
        handleSelectBuyAsset,
        handleApprove,
        handleSwap,
        hasEnteredValues,
        isQuoting,
        quoteError,
        rate,
        priceImpact,
        amountOutMin,
        amountInMax,
        slippageBps,
        needsApproval: allowance.needsApproval,
        approveTx,
        swapTx,
    }
}
