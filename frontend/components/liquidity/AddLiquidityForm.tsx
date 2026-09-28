'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatUnits } from 'viem'
import { useAccount } from 'wagmi'
import { useCorrectNetwork } from '@/hooks/use-correct-network'
import { useAddLiquidity } from '@/hooks/use-add-liquidity'
import { TokenAmountCard } from '@/components/liquidity/TokenAmountCard'
import { AddLiquidityReviewModal, type AddLiquidityModalPhase } from '@/components/liquidity/AddLiquidityReviewModal'
import { ApproveStatusModal } from '@/components/trade/ApproveStatusModal'
import { TxActionButton } from '@/components/shared/TxActionButton'
import type { TxFlowStatus } from '@/components/shared/TxFlowAnimation'
import type { Asset } from '@/lib/contracts'

interface AddLiquidityFormProps {

    initialTokenAAddress?: string
    initialTokenBAddress?: string
    locked?: boolean
    hideFooterText?: boolean
}

export const AddLiquidityForm: React.FC<AddLiquidityFormProps> = ({
    initialTokenAAddress,
    initialTokenBAddress,
    locked = false,
    hideFooterText = false,
}) => {
    const { isConnected } = useAccount()
    const { isWrongNetwork, isSwitching, switchToCorrectNetwork } = useCorrectNetwork()
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
    const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false)
    const [approvingAsset, setApprovingAsset] = useState<Asset | null>(null)
    const [approvingAmount, setApprovingAmount] = useState<bigint | null>(null)

    const {
        tokenA,
        tokenB,
        amountADisplay,
        amountBDisplay,
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
        needsApprovalA,
        needsApprovalB,
        parsedAmountA,
        parsedAmountB,
        approveTx,
        supplyTx,
    } = useAddLiquidity(initialTokenAAddress, initialTokenBAddress)

    const handleApproveClick = (asset: Asset, amount: bigint) => {
        approveTx.reset()
        setApprovingAsset(asset)
        setApprovingAmount(amount)
        setIsApproveModalOpen(true)
        handleApprove(asset, amount)
    }

    const handleSupplyClick = () => {
        supplyTx.reset()
        setIsSupplyModalOpen(true)
    }

    const handleSupplyModalOpenChange = (open: boolean) => {
        setIsSupplyModalOpen(open)
        if (!open && supplyTx.isSuccess) {
            resetSupplyForm()
        }
    }

    const approveStatus: TxFlowStatus = approveTx.error ? 'error' : approveTx.isSuccess ? 'success' : 'sending'
    const supplyPhase: AddLiquidityModalPhase = supplyTx.error
        ? 'error'
        : supplyTx.isSuccess
            ? 'success'
            : supplyTx.isPending || supplyTx.isConfirming
                ? 'sending'
                : 'review'

    const insufficientAsset = isInsufficientBalanceA ? tokenA : isInsufficientBalanceB ? tokenB : undefined

    return (
        <>
            <div className="card relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] rounded-3xl md:rounded-[1.6vw] p-4 md:p-[1.2vw] transition-all duration-300 flex flex-col gap-1 md:gap-[0.3vw]">

                <TokenAmountCard
                    label="First token"
                    asset={tokenA}
                    excludeSymbol={tokenB.symbol}
                    onSelect={handleSelectTokenA}
                    amount={amountADisplay}
                    onAmountChange={setAmountAInput}
                    onFocus={handleFocusA}
                    balance={tokenABalance}
                    locked={locked}
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
                    amount={amountBDisplay}
                    onAmountChange={setAmountBInput}
                    onFocus={handleFocusB}
                    balance={tokenBBalance}
                    locked={locked}
                />

                {pairExists && reserveA !== undefined && reserveB !== undefined && reserveA > BigInt(0) && (
                    <p className="text-gray-400 text-xs md:text-[0.85vw] text-center mt-2 md:mt-[0.4vw]">
                        Current price: 1 {tokenA.symbol} = {(Number(formatUnits(reserveB, 18)) / Number(formatUnits(reserveA, 18))).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tokenB.symbol}
                    </p>
                )}

                {/* STATUS — error approve/supply ditampilkan di dalam popup masing-masing */}
                {insufficientAsset && (
                    <p className="text-red-400 text-xs md:text-[0.85vw] text-center mt-2 md:mt-[0.5vw]">
                        Insufficient {insufficientAsset.symbol} balance.
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
                            <div className="flex flex-col items-center gap-1 text-center py-2">
                                <span className="text-emerald-400 text-sm md:text-[1vw] font-semibold">Liquidity added!</span>
                            </div>
                        }
                        approvalSteps={[
                            {
                                needsApproval: needsApprovalA,
                                label: `Approve ${tokenA.symbol}`,
                                disabled: !hasValidAmounts || isInsufficientBalance,
                                isPending: approveTx.isPending,
                                isConfirming: approveTx.isConfirming,
                                onApprove: () => handleApproveClick(tokenA, parsedAmountA as bigint),
                            },
                            {
                                needsApproval: needsApprovalB,
                                label: `Approve ${tokenB.symbol}`,
                                disabled: !hasValidAmounts || isInsufficientBalance,
                                isPending: approveTx.isPending,
                                isConfirming: approveTx.isConfirming,
                                onApprove: () => handleApproveClick(tokenB, parsedAmountB as bigint),
                            },
                        ]}
                        submit={{
                            disabled: !hasValidAmounts || isInsufficientBalance,
                            isPending: supplyTx.isPending,
                            isConfirming: supplyTx.isConfirming,
                            confirmingLabel: 'Supplying...',
                            idleLabel: isInsufficientBalance ? 'Insufficient balance' : hasValidAmounts ? 'Supply' : 'Enter an amount',
                            onSubmit: handleSupplyClick,
                        }}
                        submitVariant={hasValidAmounts && !isInsufficientBalance ? 'accent' : 'primary'}
                    />
                </div>
            </div>

            {!hideFooterText && (
                <p className="relative z-10 text-gray-400 text-xs md:text-[1vw] w-full max-w-[360px] md:max-w-[32vw] text-center mt-6 md:mt-[1.5vw] leading-relaxed">
                    If this pair already has liquidity, your amounts are automatically adjusted to match the current price,
                    the ratio you enter only sets the price for a brand new pair.
                </p>
            )}

            <ApproveStatusModal
                open={isApproveModalOpen}
                onOpenChange={setIsApproveModalOpen}
                symbol={approvingAsset?.symbol ?? ''}
                status={approveStatus}
                onRetry={() => approvingAsset && approvingAmount !== null && handleApprove(approvingAsset, approvingAmount)}
            />

            <AddLiquidityReviewModal
                open={isSupplyModalOpen}
                onOpenChange={handleSupplyModalOpenChange}
                phase={supplyPhase}
                tokenA={tokenA}
                tokenB={tokenB}
                amountADisplay={amountADisplay}
                amountBDisplay={amountBDisplay}
                pairExists={pairExists}
                amountAMin={amountAMin}
                amountBMin={amountBMin}
                hash={supplyTx.hash}
                onConfirm={handleSupply}
            />
        </>
    )
}
