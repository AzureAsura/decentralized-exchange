'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ChevronDown, Info } from 'lucide-react'
import { toast } from 'sonner'
import { erc20Abi, formatUnits, parseEther } from 'viem'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { ASSETS, ROUTER_ADDRESS, WBNB_ADDRESS, routerAbi, type Asset } from '@/lib/contracts'
import { AssetSelectModal } from '@/components/AssetSelectModal'
import { ConnectWalletModal } from '@/components/ConnectWalletModal'
import { SettingsModal } from '@/components/SettingsModal'
import { TokenIcon } from '@/components/TokenIcon'
import { useCorrectNetwork } from '@/hooks/use-correct-network'
import { useSettings } from '@/hooks/use-settings'
import { usePairReserves } from '@/hooks/use-pair-reserves'
import { useAssetBalance } from '@/hooks/use-asset-balance'

const safeParseEther = (value: string): bigint | undefined => {
    if (!value || Number.isNaN(Number(value)) || Number(value) <= 0) return undefined
    try {
        return parseEther(value)
    } catch {
        return undefined
    }
}

const formatAmount = (value: bigint) => Number(formatUnits(value, 18)).toLocaleString(undefined, { maximumFractionDigits: 6 })

const resolvePathAddress = (asset: Asset): `0x${string}` => asset.address ?? WBNB_ADDRESS

const Page = () => {
    const { address, isConnected } = useAccount()
    const { isWrongNetwork, isSwitching, switchError, switchToCorrectNetwork } = useCorrectNetwork()
    const { slippageBps, deadlineMinutes } = useSettings()

    const [sellAsset, setSellAsset] = useState<Asset>(ASSETS[0])
    const [buyAsset, setBuyAsset] = useState<Asset>(ASSETS[1])
    // Raw teks yang diketik user — cuma "berlaku" buat sisi yang lagi aktif (activeSide).
    // Sisi yang nggak aktif nilainya DIDERIVE dari hasil quote, bukan di-setState via effect.
    const [sellInput, setSellInput] = useState('')
    const [buyInput, setBuyInput] = useState('')
    const [activeSide, setActiveSide] = useState<'sell' | 'buy'>('sell')
    const [isDetailsOpen, setIsDetailsOpen] = useState(true)

    const path = useMemo(
        () => [resolvePathAddress(sellAsset), resolvePathAddress(buyAsset)],
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
        activeSide === 'sell' && amountsOut ? (amountsOut[amountsOut.length - 1] * (BigInt(10000) - slippageBpsBig)) / BigInt(10000) : undefined
    const amountInMax =
        activeSide === 'buy' && amountsIn ? (amountsIn[0] * (BigInt(10000) + slippageBpsBig)) / BigInt(10000) : undefined

    const requiredApprovalAmount = activeSide === 'sell' ? parsedSellAmount : amountInMax

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: sellAsset.address ?? undefined,
        abi: erc20Abi,
        functionName: 'allowance',
        args: address && sellAsset.address ? [address, ROUTER_ADDRESS] : undefined,
        query: { enabled: Boolean(address) && sellAsset.address !== null },
    })

    const needsApproval =
        sellAsset.address !== null &&
        requiredApprovalAmount !== undefined &&
        (allowance === undefined || allowance < requiredApprovalAmount)

    const {
        writeContract: approve,
        data: approveHash,
        isPending: isApprovePending,
        error: approveError,
    } = useWriteContract()
    const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
        hash: approveHash,
    })

    useEffect(() => {
        if (isApproveConfirmed) refetchAllowance()
    }, [isApproveConfirmed, refetchAllowance])

    useEffect(() => {
        if (isApprovePending) toast.loading('Confirm the approval in your wallet...', { id: 'approve' })
    }, [isApprovePending])

    useEffect(() => {
        if (approveHash && isApproveConfirming) toast.loading('Approving...', { id: 'approve' })
    }, [approveHash, isApproveConfirming])

    useEffect(() => {
        if (isApproveConfirmed) toast.success('Approved', { id: 'approve' })
    }, [isApproveConfirmed])

    useEffect(() => {
        if (approveError) toast.error('Approval failed or was rejected', { id: 'approve' })
    }, [approveError])

    const {
        writeContract: swap,
        data: swapHash,
        isPending: isSwapPending,
        error: swapError,
    } = useWriteContract()
    const { isLoading: isSwapConfirming, isSuccess: isSwapConfirmed } = useWaitForTransactionReceipt({
        hash: swapHash,
    })

    useEffect(() => {
        if (isSwapPending) toast.loading('Confirm the swap in your wallet...', { id: 'swap' })
    }, [isSwapPending])

    useEffect(() => {
        if (swapHash && isSwapConfirming) toast.loading('Swapping...', { id: 'swap' })
    }, [swapHash, isSwapConfirming])

    useEffect(() => {
        if (isSwapConfirmed) toast.success('Swap complete!', { id: 'swap' })
    }, [isSwapConfirmed])

    useEffect(() => {
        if (swapError) toast.error('Swap failed or was rejected', { id: 'swap' })
    }, [swapError])

    useEffect(() => {
        if (switchError) toast.error('Failed to switch network')
    }, [switchError])

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
        approve({ address: sellAsset.address, abi: erc20Abi, functionName: 'approve', args: [ROUTER_ADDRESS, requiredApprovalAmount] })
    }

    const handleSwap = () => {
        if (!address) return
        const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60)
        const isSellNative = sellAsset.address === null
        const isBuyNative = buyAsset.address === null

        if (activeSide === 'sell') {
            if (amountOutMin === undefined || parsedSellAmount === undefined) return
            if (isSellNative) {
                swap({ address: ROUTER_ADDRESS, abi: routerAbi, functionName: 'swapExactETHForTokens', args: [amountOutMin, path, address, deadline], value: parsedSellAmount })
            } else if (isBuyNative) {
                swap({ address: ROUTER_ADDRESS, abi: routerAbi, functionName: 'swapExactTokensForETH', args: [parsedSellAmount, amountOutMin, path, address, deadline] })
            } else {
                swap({ address: ROUTER_ADDRESS, abi: routerAbi, functionName: 'swapExactTokensForTokens', args: [parsedSellAmount, amountOutMin, path, address, deadline] })
            }
        } else {
            if (amountInMax === undefined || parsedBuyAmount === undefined) return
            if (isSellNative) {
                swap({ address: ROUTER_ADDRESS, abi: routerAbi, functionName: 'swapETHForExactTokens', args: [parsedBuyAmount, path, address, deadline], value: amountInMax })
            } else if (isBuyNative) {
                swap({ address: ROUTER_ADDRESS, abi: routerAbi, functionName: 'swapTokensForExactETH', args: [parsedBuyAmount, amountInMax, path, address, deadline] })
            } else {
                swap({ address: ROUTER_ADDRESS, abi: routerAbi, functionName: 'swapTokensForExactTokens', args: [parsedBuyAmount, amountInMax, path, address, deadline] })
            }
        }
    }

    const isQuoting = activeSide === 'sell' ? isQuotingOut : isQuotingIn
    const rate =
        parsedSellAmount && parsedBuyAmount && parsedSellAmount > BigInt(0)
            ? Number(formatUnits(parsedBuyAmount, 18)) / Number(formatUnits(parsedSellAmount, 18))
            : undefined

    return (
        <div className="relative min-h-screen w-full bg-transparent text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none p-4 md:p-[2vw]">

            {/* CONTAINER WIDGET */}
            <div className="card relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] rounded-3xl md:rounded-[1.6vw] p-2 md:p-[0.55vw] transition-all duration-300">

                {/* HEADER WIDGET (SWAP + SETTING) */}
                <div className="flex items-center justify-between px-3 md:px-[0.8vw] pt-2 md:pt-[0.4vw] pb-2 md:pb-[0.5vw]">
                    <span className="text-base md:text-[1.1vw] font-bold text-white tracking-tight">Swap</span>
                    <SettingsModal
                        trigger={
                            <button
                                type="button"
                                className="p-1.5 md:p-[0.4vw] rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                                title="Swap Settings"
                            >
                                <svg className="w-4 h-4 md:w-[1.1vw] md:h-[1.1vw]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        }
                    />
                </div>

                {/* SELL CARD */}
                <div
                    onClick={handleFocusSell}
                    className={`rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] transition-all duration-300 cursor-text relative ${activeSide === 'sell'
                            ? 'card-dark border border-blue-500/50 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                            : 'card border border-transparent'
                        }`}
                >
                    <div className="flex items-center justify-between mb-1 md:mb-[0.1vw]">
                        <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium">Sell</span>
                        
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center w-[55%]">
                            <input
                                type="text"
                                value={sellDisplay}
                                onChange={(e) => setSellInput(e.target.value)}
                                onFocus={handleFocusSell}
                                placeholder="0.0"
                                className={`bg-transparent text-3xl md:text-[2.8vw] font-bold outline-none w-full tracking-tight leading-none transition-colors placeholder-gray-600 ${activeSide === 'sell' ? 'text-white' : 'text-gray-500'
                                    }`}
                            />
                        </div>

                        <AssetSelectModal
                            assets={ASSETS}
                            excludeSymbol={buyAsset.symbol}
                            onSelect={handleSelectSellAsset}
                            trigger={
                                <button className="flex items-center gap-2 md:gap-[0.5vw] card-light rounded-full py-1.5 md:py-[0.4vw] px-3 md:px-[0.9vw] backdrop-blur-md transition-all duration-150 active:scale-95 shrink-0">
                                    <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                        <TokenIcon symbol={sellAsset.symbol} className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw]" />
                                    </div>
                                    <span className="text-sm md:text-[1.1vw] font-[600] text-white tracking-tight">{sellAsset.symbol}</span>
                                    <ChevronDown className="w-3 h-3 md:w-[0.85vw] md:h-[0.85vw] text-gray-400 stroke-[3.5]" />
                                </button>
                            }
                        />
                    </div>

                    {sellBalance && (
                            <span className="text-gray-500 text-xs md:text-[0.8vw]">
                                Balance: {Number(formatUnits(sellBalance.value, sellBalance.decimals)).toFixed(4)}
                            </span>
                        )}
                </div>

                {/* SWAP BUTTON */}
                <div className="relative h-2 md:h-[0.6vw] flex items-center justify-center -my-1 md:my-[-0.2vw] z-20">
                    <div className="relative h-3 md:h-[0.8vw] flex items-center justify-center -my-1.5 md:my-[-0.35vw] z-20">
                        <button
                            onClick={handleSwapDirection}
                            className="btn-color text-white p-2 md:p-[0.55vw] rounded-xl md:rounded-[0.9vw] transition-all duration-200 active:scale-90 hover:scale-105 shadow-[0_4px_15px_rgba(0,0,0,0.4)] flex items-center justify-center group"
                            title="Swap direction"
                        >
                            <ArrowDown className="w-4 h-4 md:w-[1.2vw] md:h-[1.2vw] stroke-[2.5] transition-transform duration-300 group-hover:rotate-180" />
                        </button>
                    </div>
                </div>

                {/* BUY CARD */}
                <div
                    onClick={handleFocusBuy}
                    className={`rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] transition-all duration-300 cursor-text relative mt-1 md:mt-[0.2vw] ${activeSide === 'buy'
                            ? 'card-dark border border-blue-500/50 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                            : 'card border border-transparent'
                        }`}
                >
                    <div className="flex items-center justify-between mb-1 md:mb-[0.1vw]">
                        <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium">Buy</span>
                    </div>

                    <div className="flex items-center justify-between min-h-[40px] md:min-h-[3.2vw] gap-2">
                        <div className="flex items-center w-[45%]">
                            <input
                                type="text"
                                value={buyDisplay}
                                onChange={(e) => setBuyInput(e.target.value)}
                                onFocus={handleFocusBuy}
                                placeholder="0.0"
                                className={`bg-transparent text-3xl md:text-[2.8vw] font-bold outline-none w-full tracking-tight leading-none transition-colors placeholder-gray-600 ${activeSide === 'buy' ? 'text-white' : 'text-gray-500'
                                    }`}
                            />
                        </div>

                        <AssetSelectModal
                            assets={ASSETS}
                            excludeSymbol={sellAsset.symbol}
                            onSelect={handleSelectBuyAsset}
                            trigger={
                                <button className="flex items-center gap-2 md:gap-[0.5vw] card-light rounded-full py-1.5 md:py-[0.4vw] px-3 md:px-[0.9vw] backdrop-blur-md transition-all duration-150 active:scale-95 shrink-0">
                                    <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                        <TokenIcon symbol={buyAsset.symbol} className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw]" />
                                    </div>
                                    <span className="text-sm md:text-[1.1vw] font-[600] text-white tracking-tight">{buyAsset.symbol}</span>
                                    <ChevronDown className="w-3 h-3 md:w-[0.85vw] md:h-[0.85vw] text-gray-400 stroke-[3.5]" />
                                </button>
                            }
                        />
                    </div>
                    {buyBalance && (
                            <span className="text-gray-500 text-xs md:text-[0.8vw]">
                                Balance: {Number(formatUnits(buyBalance.value, buyBalance.decimals)).toFixed(4)}
                            </span>
                        )}
                </div>

                {/* DETAIL SWAP (real, bukan mockup lagi) */}
                {hasEnteredValues && (
                    <div className="mt-2 md:mt-[0.5vw] rounded-2xl md:rounded-[1.2vw] card p-3 md:p-[0.8vw] border border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div
                            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                            className="flex items-center justify-between cursor-pointer text-xs md:text-[0.85vw] text-gray-300 font-medium"
                        >
                            <div className="flex items-center gap-1.5 md:gap-[0.4vw]">
                                <Info className="w-3.5 h-3.5 md:w-[0.9vw] md:h-[0.9vw] text-gray-400" />
                                <span>{rate ? `1 ${sellAsset.symbol} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${buyAsset.symbol}` : isQuoting ? 'Fetching quote...' : '—'}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 md:w-[1vw] md:h-[1vw] text-gray-400 transition-transform duration-200 ${isDetailsOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isDetailsOpen && (
                            <div className="mt-3 md:mt-[0.6vw] pt-3 md:pt-[0.6vw] border-t border-white/10 flex flex-col gap-2 md:gap-[0.4vw] text-xs md:text-[0.8vw]">
                                <div className="flex justify-between items-center text-gray-400">
                                    <span>Expected Output</span>
                                    <span className="text-white font-semibold">{buyDisplay} {buyAsset.symbol}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-400">
                                    <span>Price Impact</span>
                                    <span className={priceImpact !== undefined && priceImpact > 3 ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>
                                        {priceImpact !== undefined ? `${priceImpact.toFixed(2)}%` : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-gray-400">
                                    <span>{activeSide === 'sell' ? `Minimum received (${(slippageBps / 100).toFixed(2)}% slippage)` : `Maximum sent (${(slippageBps / 100).toFixed(2)}% slippage)`}</span>
                                    <span className="text-gray-300">
                                        {activeSide === 'sell' && amountOutMin !== undefined
                                            ? `${formatAmount(amountOutMin)} ${buyAsset.symbol}`
                                            : activeSide === 'buy' && amountInMax !== undefined
                                                ? `${formatAmount(amountInMax)} ${sellAsset.symbol}`
                                                : '—'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STATUS */}
                {(approveError || swapError) && (
                    <p className="text-red-400 text-xs md:text-[0.85vw] text-center mt-2 md:mt-[0.5vw]">
                        Transaction failed — please try again.
                    </p>
                )}
                {!approveError && !swapError && quoteError && (
                    <p className="text-red-400 text-xs md:text-[0.85vw] text-center mt-2 md:mt-[0.5vw]">
                        Insufficient liquidity for this trade — try a smaller amount.
                    </p>
                )}

                {/* BUTTON ACTION */}
                <div className="mt-2 md:mt-[0.4vw]">
                    {isSwapConfirmed ? (
                        <div className="flex flex-col items-center gap-1 text-center py-2">
                            <span className="text-emerald-400 text-sm md:text-[1vw] font-semibold">Swap complete!</span>
                        </div>
                    ) : !isConnected ? (
                        <ConnectWalletModal
                            trigger={
                                <button
                                    type="button"
                                    className="btn-color w-full text-white font-semibold text-base md:text-[1.15vw] py-3 md:py-[0.85vw] rounded-2xl md:rounded-[1.2vw] transition-all active:scale-[0.99]"
                                >
                                    Connect Wallet
                                </button>
                            }
                        />
                    ) : isWrongNetwork ? (
                        <button
                            type="button"
                            disabled={isSwitching}
                            onClick={switchToCorrectNetwork}
                            className="w-full text-red-400 bg-red-500/10 border border-red-500/40 font-semibold text-base md:text-[1.15vw] py-3 md:py-[0.85vw] rounded-2xl md:rounded-[1.2vw] transition-all active:scale-[0.99] disabled:opacity-60"
                        >
                            {isSwitching ? 'Switching...' : 'Switch to BNB Testnet'}
                        </button>
                    ) : needsApproval ? (
                        <button
                            type="button"
                            disabled={!hasEnteredValues || isApprovePending || isApproveConfirming}
                            onClick={handleApprove}
                            className="btn-color w-full text-white font-semibold text-base md:text-[1.15vw] py-3 md:py-[0.85vw] rounded-2xl md:rounded-[1.2vw] transition-all active:scale-[0.99] disabled:opacity-40"
                        >
                            {isApprovePending ? 'Confirm in wallet...' : isApproveConfirming ? 'Approving...' : `Approve ${sellAsset.symbol}`}
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={!hasEnteredValues || isSwapPending || isSwapConfirming || isQuoting || Boolean(quoteError)}
                            onClick={handleSwap}
                            className="btn-color w-full text-white font-semibold text-base md:text-[1.15vw] py-3 md:py-[0.85vw] rounded-2xl md:rounded-[1.2vw] transition-all active:scale-[0.99] disabled:opacity-40"
                        >
                            {isSwapPending
                                ? 'Confirm in wallet...'
                                : isSwapConfirming
                                    ? 'Swapping...'
                                    : quoteError
                                        ? 'Insufficient liquidity'
                                        : hasEnteredValues
                                            ? 'Swap'
                                            : 'Enter an amount'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Page
