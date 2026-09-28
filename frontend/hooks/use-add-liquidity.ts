'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { keepPreviousData } from '@tanstack/react-query'
import { erc20Abi, formatUnits } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { ASSETS, NATIVE_BNB, ROUTER_ADDRESS, TEST_TOKENS, WBNB_ADDRESS, routerAbi, type Asset } from '@/lib/contracts'
import { safeParseEther } from '@/lib/format'
import { applySlippageMin, resolvePathAddress } from '@/lib/swap'
import { useAllowance } from '@/hooks/use-allowance'
import { useAssetBalance } from '@/hooks/use-asset-balance'
import { useImportedTokens } from '@/hooks/use-imported-tokens'
import { usePairReserves } from '@/hooks/use-pair-reserves'
import { useSettings } from '@/hooks/use-settings'
import { useTransaction } from '@/hooks/use-transaction'

// Alamat WBNB di-map balik ke NATIVE_BNB (address null) — dipakai baik dari query param
// (/liquidity/new?tokenA=...) maupun override langsung (embed di halaman /liquidity/[pair]).
// extraAssets: token custom yang udah di-import user (Phase 4), dicari juga selain ASSETS bawaan.
const resolveAssetFromAddress = (addr: string | null | undefined, fallback: Asset, extraAssets: Asset[]): Asset => {
    if (!addr) return fallback
    if (addr.toLowerCase() === WBNB_ADDRESS.toLowerCase()) return NATIVE_BNB
    return [...ASSETS, ...extraAssets].find((a) => a.address?.toLowerCase() === addr.toLowerCase()) ?? fallback
}

// initialTokenA/BAddress: override eksplisit (dipakai saat di-embed di halaman pair, dikunci ke
// token pair itu) — kalau nggak dikasih, fallback ke query param (?tokenA=&tokenB=, dipakai
// /liquidity/new dari link "Add more liquidity").
export function useAddLiquidity(initialTokenAAddress?: string, initialTokenBAddress?: string) {
    const { address } = useAccount()
    const { slippageBps, deadlineMinutes } = useSettings()
    const searchParams = useSearchParams()
    const { importedTokens } = useImportedTokens()

    const [tokenA, setTokenA] = useState<Asset>(() =>
        resolveAssetFromAddress(initialTokenAAddress ?? searchParams.get('tokenA'), NATIVE_BNB, importedTokens)
    )
    const [tokenB, setTokenB] = useState<Asset>(() =>
        resolveAssetFromAddress(initialTokenBAddress ?? searchParams.get('tokenB'), TEST_TOKENS[0], importedTokens)
    )

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
        !pairExists || activeSide === 'a'
            ? amountAInput
            : typedAmountB === undefined
              ? ''
              : quotedA !== undefined
                ? formatUnits(quotedA, 18)
                : ''
    const amountBDisplay =
        !pairExists || activeSide === 'b'
            ? amountBInput
            : typedAmountA === undefined
              ? ''
              : quotedB !== undefined
                ? formatUnits(quotedB, 18)
                : ''

    const hasValidAmounts = parsedAmountA !== undefined && parsedAmountB !== undefined

    const isInsufficientBalanceA =
        parsedAmountA !== undefined && tokenABalance !== undefined && parsedAmountA > tokenABalance.value
    const isInsufficientBalanceB =
        parsedAmountB !== undefined && tokenBBalance !== undefined && parsedAmountB > tokenBBalance.value
    const isInsufficientBalance = isInsufficientBalanceA || isInsufficientBalanceB

    const slippageBpsBig = BigInt(slippageBps)

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
