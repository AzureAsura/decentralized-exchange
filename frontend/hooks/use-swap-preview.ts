'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { formatUnits } from 'viem'
import { useReadContract } from 'wagmi'
import { ASSETS, NATIVE_BNB, ROUTER_ADDRESS, routerAbi, type Asset } from '@/lib/contracts'
import { safeParseEther } from '@/lib/format'
import { resolvePathAddress } from '@/lib/swap'

export function useSwapPreview() {
    const [sellAsset, setSellAsset] = useState<Asset>(NATIVE_BNB)
    const [buyAsset, setBuyAsset] = useState<Asset | undefined>(undefined)
    const [sellInput, setSellInput] = useState('')
    const [buyInput, setBuyInput] = useState('')
    const [activeSide, setActiveSide] = useState<'sell' | 'buy'>('sell')

    const path = buyAsset ? ([resolvePathAddress(sellAsset), resolvePathAddress(buyAsset)] as const) : undefined

    const typedSellAmount = activeSide === 'sell' ? safeParseEther(sellInput) : undefined
    const typedBuyAmount = activeSide === 'buy' ? safeParseEther(buyInput) : undefined

    const { data: amountsOut } = useReadContract({
        address: ROUTER_ADDRESS,
        abi: routerAbi,
        functionName: 'getAmountsOut',
        args: typedSellAmount !== undefined && path ? [typedSellAmount, path] : undefined,
        query: {
            enabled: activeSide === 'sell' && typedSellAmount !== undefined && Boolean(path),
            retry: false,
            placeholderData: keepPreviousData,
        },
    })

    const { data: amountsIn } = useReadContract({
        address: ROUTER_ADDRESS,
        abi: routerAbi,
        functionName: 'getAmountsIn',
        args: typedBuyAmount !== undefined && path ? [typedBuyAmount, path] : undefined,
        query: {
            enabled: activeSide === 'buy' && typedBuyAmount !== undefined && Boolean(path),
            retry: false,
            placeholderData: keepPreviousData,
        },
    })

    const derivedBuyAmount = activeSide === 'sell' ? amountsOut?.[amountsOut.length - 1] : undefined
    const derivedSellAmount = activeSide === 'buy' ? amountsIn?.[0] : undefined

    const sellDisplay =
        activeSide === 'sell'
            ? sellInput
            : !buyAsset || typedBuyAmount === undefined
              ? ''
              : derivedSellAmount !== undefined
                ? formatUnits(derivedSellAmount, 18)
                : ''
    const buyDisplay =
        activeSide === 'buy'
            ? buyInput
            : !buyAsset || typedSellAmount === undefined
              ? ''
              : derivedBuyAmount !== undefined
                ? formatUnits(derivedBuyAmount, 18)
                : ''

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

    const handleSelectSellAsset = (asset: Asset) => {
        setSellAsset(asset)
        if (buyAsset?.symbol === asset.symbol) setBuyAsset(undefined)
    }

    const handleSelectBuyAsset = (asset: Asset) => {
        setBuyAsset(asset)
        if (sellAsset.symbol === asset.symbol) setSellAsset(ASSETS.find((a) => a.symbol !== asset.symbol) ?? ASSETS[0])
    }

    return {
        sellAsset,
        buyAsset,
        sellDisplay,
        buyDisplay,
        activeSide,
        setSellInput,
        setBuyInput,
        setActiveSide,
        handleFocusSell,
        handleFocusBuy,
        handleSelectSellAsset,
        handleSelectBuyAsset,
    }
}
