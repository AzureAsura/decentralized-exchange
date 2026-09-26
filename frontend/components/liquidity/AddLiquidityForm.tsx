'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { erc20Abi } from 'viem'
import { useAccount } from 'wagmi'
import { ROUTER_ADDRESS, routerAbi, TEST_TOKENS, ASSETS, NATIVE_BNB, type Asset } from '@/lib/contracts'
import { safeParseEther } from '@/lib/format'
import { useCorrectNetwork } from '@/hooks/use-correct-network'
import { useAllowance } from '@/hooks/use-allowance'
import { useTransaction } from '@/hooks/use-transaction'
import { TokenAmountCard } from '@/components/liquidity/TokenAmountCard'
import { TxActionButton } from '@/components/shared/TxActionButton'

export const AddLiquidityForm: React.FC = () => {
    const { address, isConnected } = useAccount()
    const { isWrongNetwork, isSwitching, switchToCorrectNetwork } = useCorrectNetwork()

    const [tokenA, setTokenA] = useState<Asset>(NATIVE_BNB)
    const [tokenB, setTokenB] = useState<Asset>(TEST_TOKENS[0])
    const [amountA, setAmountA] = useState('')
    const [amountB, setAmountB] = useState('')

    const parsedAmountA = safeParseEther(amountA)
    const parsedAmountB = safeParseEther(amountB)
    const hasValidAmounts = parsedAmountA !== undefined && parsedAmountB !== undefined

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
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20)

        if (isNativePair) {
            const [ercAsset, ercAmount, ethAmount] =
                tokenA.address === null ? [tokenB, parsedAmountB, parsedAmountA] : [tokenA, parsedAmountA, parsedAmountB]
            if (!ercAsset.address) return
            supplyTx.send({
                address: ROUTER_ADDRESS,
                abi: routerAbi,
                functionName: 'addLiquidityETH',
                args: [ercAsset.address, ercAmount as bigint, BigInt(0), BigInt(0), address, deadline],
                value: ethAmount as bigint,
            })
        } else {
            if (!tokenA.address || !tokenB.address) return
            supplyTx.send({
                address: ROUTER_ADDRESS,
                abi: routerAbi,
                functionName: 'addLiquidity',
                args: [tokenA.address, tokenB.address, parsedAmountA, parsedAmountB, BigInt(0), BigInt(0), address, deadline],
            })
        }
    }

    return (
        <>
            <div className="card relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] rounded-3xl md:rounded-[1.6vw] p-4 md:p-[1.2vw] transition-all duration-300 flex flex-col gap-1 md:gap-[0.3vw]">

                <TokenAmountCard
                    label="First token"
                    asset={tokenA}
                    excludeSymbol={tokenB.symbol}
                    onSelect={handleSelectTokenA}
                    amount={amountA}
                    onAmountChange={setAmountA}
                />

                <div className="relative h-2 md:h-[0.6vw] flex items-center justify-center -my-1 md:my-[-0.2vw] z-20">
                    <div className="btn-color text-white p-1.5 md:p-[0.4vw] rounded-lg md:rounded-[0.7vw] shadow-[0_4px_15px_rgba(0,0,0,0.4)] flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5 md:w-[1vw] md:h-[1vw] stroke-[2.5]" />
                    </div>
                </div>

                <TokenAmountCard
                    label="Second token"
                    asset={tokenB}
                    excludeSymbol={tokenA.symbol}
                    onSelect={handleSelectTokenB}
                    amount={amountB}
                    onAmountChange={setAmountB}
                />

                {/* STATUS */}
                {(approveTx.error || supplyTx.error) && (
                    <p className="text-red-400 text-xs md:text-[0.85vw] text-center mt-2 md:mt-[0.5vw]">
                        Transaction failed — please try again.
                    </p>
                )}

                <div className="mt-2 md:mt-[0.5vw]">
                    <TxActionButton
                        sizeClassName="text-base md:text-[1.1vw] py-3 md:py-[0.8vw] rounded-2xl"
                        isConnected={isConnected}
                        isWrongNetwork={isWrongNetwork}
                        isSwitching={isSwitching}
                        onSwitchNetwork={switchToCorrectNetwork}
                        isSuccess={supplyTx.isSuccess}
                        successContent={
                            <div className="flex flex-col items-center gap-2 md:gap-[0.5vw] text-center">
                                <span className="text-emerald-400 text-sm md:text-[1vw] font-semibold">Liquidity added!</span>
                                <Link href="/liquidity" className="text-blue-400 text-xs md:text-[0.9vw] hover:underline">
                                    View pools
                                </Link>
                            </div>
                        }
                        approvalSteps={[
                            {
                                needsApproval: allowanceA.needsApproval,
                                label: `Approve ${tokenA.symbol}`,
                                disabled: !hasValidAmounts,
                                isPending: approveTx.isPending,
                                isConfirming: approveTx.isConfirming,
                                onApprove: () => handleApprove(tokenA, parsedAmountA as bigint),
                            },
                            {
                                needsApproval: allowanceB.needsApproval,
                                label: `Approve ${tokenB.symbol}`,
                                disabled: !hasValidAmounts,
                                isPending: approveTx.isPending,
                                isConfirming: approveTx.isConfirming,
                                onApprove: () => handleApprove(tokenB, parsedAmountB as bigint),
                            },
                        ]}
                        submit={{
                            disabled: !hasValidAmounts,
                            isPending: supplyTx.isPending,
                            isConfirming: supplyTx.isConfirming,
                            confirmingLabel: 'Supplying...',
                            idleLabel: 'Supply',
                            onSubmit: handleSupply,
                        }}
                    />
                </div>
            </div>

            <p className="relative z-10 text-gray-400 text-xs md:text-[1vw] w-full max-w-[360px] md:max-w-[32vw] text-center mt-6 md:mt-[1.5vw] leading-relaxed">
                If this pair already has liquidity, your amounts are automatically adjusted to match the current price —
                the ratio you enter only sets the price for a brand-new pair.
            </p>
        </>
    )
}
