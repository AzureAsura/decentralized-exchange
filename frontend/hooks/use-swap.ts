'use client'

import { useMemo, useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { erc20Abi, formatUnits } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { ASSETS, ROUTER_ADDRESS, WBNB_ADDRESS, routerAbi, type Asset } from '@/lib/contracts'
import { safeParseEther } from '@/lib/format'
import { applySlippageMax, applySlippageMin, buildSwapRequest, resolvePathAddress } from '@/lib/swap'
import { useAllowance } from '@/hooks/use-allowance'
import { useAssetBalance } from '@/hooks/use-asset-balance'
import { useImportedTokens } from '@/hooks/use-imported-tokens'
import { usePairReserves } from '@/hooks/use-pair-reserves'
import { useSettings } from '@/hooks/use-settings'
import { useSwapRoute } from '@/hooks/use-swap-route'
import { useTransaction } from '@/hooks/use-transaction'

const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

export function useSwap() {
    const { address } = useAccount()
    const { slippageBps, deadlineMinutes } = useSettings()
    const { importedTokens } = useImportedTokens()

    const [sellAsset, setSellAsset] = useState<Asset>(ASSETS[0])
    const [buyAsset, setBuyAsset] = useState<Asset>(ASSETS[1])

    const [sellInput, setSellInput] = useState('')
    const [buyInput, setBuyInput] = useState('')
    const [activeSide, setActiveSide] = useState<'sell' | 'buy'>('sell')

    // Pathfinding (graph umum, bukan cuma via-BNB) — cari rute lewat pair APAPUN yang ada di
    // Factory, bukan cuma pasangan langsung sellAsset/buyAsset. Kalau pair langsung ADA, BFS di
    // dalamnya SELALU balikin itu duluan (jarak 1), jadi swap yang udah jalan sekarang nggak
    // pernah ke-reroute — lihat lib/routing.ts.
    const {
        path: routedPath,
        routeExists,
        isMultiHop,
        isLoading: isLoadingRoute,
    } = useSwapRoute(sellAsset, buyAsset)
    const path = routedPath ?? [resolvePathAddress(sellAsset), resolvePathAddress(buyAsset)]

    const resolveHopSymbol = (addr: `0x${string}`) => {
        if (addr.toLowerCase() === WBNB_ADDRESS.toLowerCase()) return 'BNB'
        return (
            [...ASSETS, ...importedTokens].find((a) => a.address?.toLowerCase() === addr.toLowerCase())?.symbol ??
            shortenAddress(addr)
        )
    }
    const routeSymbols = isMultiHop ? path.map(resolveHopSymbol) : undefined

    const typedSellAmount = activeSide === 'sell' ? safeParseEther(sellInput) : undefined
    const typedBuyAmount = activeSide === 'buy' ? safeParseEther(buyInput) : undefined

    const sellBalance = useAssetBalance(sellAsset, address)
    const buyBalance = useAssetBalance(buyAsset, address)

    const {
        data: amountsOut,
        isFetching: isQuotingOut,
        error: amountsOutError,
    } = useReadContract({
        address: ROUTER_ADDRESS,
        abi: routerAbi,
        functionName: 'getAmountsOut',
        args: typedSellAmount !== undefined ? [typedSellAmount, path] : undefined,
        query: {
            enabled: activeSide === 'sell' && typedSellAmount !== undefined && routeExists,
            retry: false,
            placeholderData: keepPreviousData,
        },
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
        query: {
            enabled: activeSide === 'buy' && typedBuyAmount !== undefined && routeExists,
            retry: false,
            placeholderData: keepPreviousData,
        },
    })

    const quoteError = activeSide === 'sell' ? amountsOutError : amountsInError

    const derivedBuyAmount = activeSide === 'sell' ? amountsOut?.[amountsOut.length - 1] : undefined
    const derivedSellAmount = activeSide === 'buy' ? amountsIn?.[0] : undefined
    const parsedSellAmount = activeSide === 'sell' ? typedSellAmount : derivedSellAmount
    const parsedBuyAmount = activeSide === 'buy' ? typedBuyAmount : derivedBuyAmount

    const sellDisplay =
        activeSide === 'sell'
            ? sellInput
            : typedBuyAmount === undefined
              ? ''
              : derivedSellAmount !== undefined
                ? formatUnits(derivedSellAmount, 18)
                : ''
    const buyDisplay =
        activeSide === 'buy'
            ? buyInput
            : typedSellAmount === undefined
              ? ''
              : derivedBuyAmount !== undefined
                ? formatUnits(derivedBuyAmount, 18)
                : ''

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

    // Price impact cuma dihitung buat rute langsung (1 pair) — multi-hop butuh gabungan reserve
    // dari SEMUA pair di path, di luar scope sekarang. SwapDetailRows.tsx udah nge-render "—" kalau
    // priceImpact undefined, jadi nggak perlu perubahan di situ.
    const { exists: pairExists, reserveA, reserveB } = usePairReserves(
        !isMultiHop ? path[0] : undefined,
        !isMultiHop ? path[1] : undefined
    )
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

    const isInsufficientBalance =
        parsedSellAmount !== undefined && sellBalance !== undefined && parsedSellAmount > sellBalance.value

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


    const resetSwapForm = () => {
        setSellInput('')
        setBuyInput('')
        setActiveSide('sell')
        swapTx.reset()
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
        resetSwapForm,
        hasEnteredValues,
        isInsufficientBalance,
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
        routeExists,
        isMultiHop,
        isLoadingRoute,
        routeSymbols,
    }
}
