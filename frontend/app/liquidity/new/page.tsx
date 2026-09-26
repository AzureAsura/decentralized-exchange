'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { erc20Abi, parseEther } from 'viem'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { ROUTER_ADDRESS, routerAbi, TEST_TOKENS, ASSETS, NATIVE_BNB, type Asset } from '@/lib/contracts'
import { ConnectWalletModal } from '@/components/shared/ConnectWalletModal'
import { useCorrectNetwork } from '@/hooks/use-correct-network'
import { TokenIcon } from '@/components/shared/TokenIcon'
import { AssetSelectModal } from '@/components/shared/AssetSelectModal'

const safeParseEther = (value: string): bigint | undefined => {
  if (!value || Number.isNaN(Number(value)) || Number(value) <= 0) return undefined
  try {
    return parseEther(value)
  } catch {
    return undefined
  }
}

interface TokenAmountCardProps {
  label: string
  asset: Asset
  excludeSymbol: string
  onSelect: (asset: Asset) => void
  amount: string
  onAmountChange: (value: string) => void
}

const TokenAmountCard: React.FC<TokenAmountCardProps> = ({
  label,
  asset,
  excludeSymbol,
  onSelect,
  amount,
  onAmountChange,
}) => (
  <div className="rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] card">
    <span className="text-gray-400 text-xs md:text-[0.9vw] font-medium block mb-1">{label}</span>
    <div className="flex items-center justify-between gap-2">
      <input
        type="text"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="0.0"
        className="bg-transparent text-3xl md:text-[2.8vw] font-bold outline-none w-[55%] tracking-tight leading-none text-white placeholder-gray-600"
      />
      <AssetSelectModal
        assets={ASSETS}
        excludeSymbol={excludeSymbol}
        onSelect={onSelect}
        trigger={
          <button className="flex items-center gap-2 md:gap-[0.5vw] card-light rounded-full py-1.5 md:py-[0.4vw] px-3 md:px-[0.9vw] backdrop-blur-md transition-all duration-150 active:scale-95 shrink-0">
            <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
              <TokenIcon symbol={asset.symbol} className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw]" />
            </div>
            <span className="text-sm md:text-[1.1vw] font-[600] text-white tracking-tight">{asset.symbol}</span>
            <ChevronDown className="w-3 h-3 md:w-[0.85vw] md:h-[0.85vw] text-gray-400 stroke-[3.5]" />
          </button>
        }
      />
    </div>
  </div>
)

const NewPoolPage = () => {
  const { address, isConnected } = useAccount()
  const { isWrongNetwork, isSwitching, switchError, switchToCorrectNetwork } = useCorrectNetwork()

  const [tokenA, setTokenA] = useState<Asset>(NATIVE_BNB)
  const [tokenB, setTokenB] = useState<Asset>(TEST_TOKENS[0])
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')

  const parsedAmountA = safeParseEther(amountA)
  const parsedAmountB = safeParseEther(amountB)
  const hasValidAmounts = parsedAmountA !== undefined && parsedAmountB !== undefined

  const isNativePair = tokenA.address === null || tokenB.address === null

  const { data: allowanceA, refetch: refetchAllowanceA } = useReadContract({
    address: tokenA.address ?? undefined,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && tokenA.address ? [address, ROUTER_ADDRESS] : undefined,
    query: { enabled: Boolean(address) && tokenA.address !== null },
  })
  const { data: allowanceB, refetch: refetchAllowanceB } = useReadContract({
    address: tokenB.address ?? undefined,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && tokenB.address ? [address, ROUTER_ADDRESS] : undefined,
    query: { enabled: Boolean(address) && tokenB.address !== null },
  })

  const needsApprovalA =
    tokenA.address !== null && parsedAmountA !== undefined && (allowanceA === undefined || allowanceA < parsedAmountA)
  const needsApprovalB =
    tokenB.address !== null && parsedAmountB !== undefined && (allowanceB === undefined || allowanceB < parsedAmountB)

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
    if (isApproveConfirmed) {
      refetchAllowanceA()
      refetchAllowanceB()
    }
  }, [isApproveConfirmed, refetchAllowanceA, refetchAllowanceB])

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
    writeContract: supply,
    data: supplyHash,
    isPending: isSupplyPending,
    error: supplyError,
  } = useWriteContract()
  const { isLoading: isSupplyConfirming, isSuccess: isSupplyConfirmed } = useWaitForTransactionReceipt({
    hash: supplyHash,
  })

  useEffect(() => {
    if (isSupplyPending) toast.loading('Confirm the supply in your wallet...', { id: 'supply' })
  }, [isSupplyPending])

  useEffect(() => {
    if (supplyHash && isSupplyConfirming) toast.loading('Adding liquidity...', { id: 'supply' })
  }, [supplyHash, isSupplyConfirming])

  useEffect(() => {
    if (isSupplyConfirmed) toast.success('Liquidity added!', { id: 'supply' })
  }, [isSupplyConfirmed])

  useEffect(() => {
    if (supplyError) toast.error('Supply failed or was rejected', { id: 'supply' })
  }, [supplyError])

  useEffect(() => {
    if (switchError) toast.error('Failed to switch network')
  }, [switchError])

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
    approve({ address: asset.address, abi: erc20Abi, functionName: 'approve', args: [ROUTER_ADDRESS, amount] })
  }

  const handleSupply = () => {
    if (!address || parsedAmountA === undefined || parsedAmountB === undefined) return
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20)

    if (isNativePair) {
      const [ercAsset, ercAmount, ethAmount] =
        tokenA.address === null ? [tokenB, parsedAmountB, parsedAmountA] : [tokenA, parsedAmountA, parsedAmountB]
      if (!ercAsset.address) return
      supply({
        address: ROUTER_ADDRESS,
        abi: routerAbi,
        functionName: 'addLiquidityETH',
        args: [ercAsset.address, ercAmount as bigint, BigInt(0), BigInt(0), address, deadline],
        value: ethAmount as bigint,
      })
    } else {
      if (!tokenA.address || !tokenB.address) return
      supply({
        address: ROUTER_ADDRESS,
        abi: routerAbi,
        functionName: 'addLiquidity',
        args: [tokenA.address, tokenB.address, parsedAmountA, parsedAmountB, BigInt(0), BigInt(0), address, deadline],
      })
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-transparent text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none p-4 md:p-[2vw]">

      {/* BACK LINK */}
      <div className="relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] mt-2 md:mt-0 mb-4 md:mb-[1vw]">
        <Link
          href="/liquidity"
          className="inline-flex items-center gap-1.5 md:gap-[0.4vw] text-gray-400 hover:text-white text-sm md:text-[0.95vw] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 md:w-[1vw] md:h-[1vw]" />
          All pools
        </Link>
      </div>

      <h1 className="text-2xl md:text-[2.2vw] font-[550] tracking-[-0.02em] text-[#E0E0E0] mb-6 md:mb-[1.5vw] z-10 text-center">
        Add Liquidity
      </h1>

      {/* CONTAINER WIDGET */}
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
        {(approveError || supplyError) && (
          <p className="text-red-400 text-xs md:text-[0.85vw] text-center mt-2 md:mt-[0.5vw]">
            Transaction failed — please try again.
          </p>
        )}

        <div className="mt-2 md:mt-[0.5vw]">
          {isSupplyConfirmed ? (
            <div className="flex flex-col items-center gap-2 md:gap-[0.5vw] text-center">
              <span className="text-emerald-400 text-sm md:text-[1vw] font-semibold">Liquidity added!</span>
              <Link href="/liquidity" className="text-blue-400 text-xs md:text-[0.9vw] hover:underline">
                View pools
              </Link>
            </div>
          ) : !isConnected ? (
            <ConnectWalletModal
              trigger={
                <button
                  type="button"
                  className="btn-color w-full text-white font-semibold text-base md:text-[1.1vw] py-3 md:py-[0.8vw] rounded-2xl transition-all active:scale-[0.99]"
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
              className="w-full text-red-400 bg-red-500/10 border border-red-500/40 font-semibold text-base md:text-[1.1vw] py-3 md:py-[0.8vw] rounded-2xl transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {isSwitching ? 'Switching...' : 'Switch to BNB Testnet'}
            </button>
          ) : needsApprovalA ? (
            <button
              type="button"
              disabled={!hasValidAmounts || isApprovePending || isApproveConfirming}
              onClick={() => handleApprove(tokenA, parsedAmountA as bigint)}
              className="btn-color w-full text-white font-semibold text-base md:text-[1.1vw] py-3 md:py-[0.8vw] rounded-2xl transition-all active:scale-[0.99] disabled:opacity-40"
            >
              {isApprovePending
                ? 'Confirm in wallet...'
                : isApproveConfirming
                  ? 'Approving...'
                  : `Approve ${tokenA.symbol}`}
            </button>
          ) : needsApprovalB ? (
            <button
              type="button"
              disabled={!hasValidAmounts || isApprovePending || isApproveConfirming}
              onClick={() => handleApprove(tokenB, parsedAmountB as bigint)}
              className="btn-color w-full text-white font-semibold text-base md:text-[1.1vw] py-3 md:py-[0.8vw] rounded-2xl transition-all active:scale-[0.99] disabled:opacity-40"
            >
              {isApprovePending
                ? 'Confirm in wallet...'
                : isApproveConfirming
                  ? 'Approving...'
                  : `Approve ${tokenB.symbol}`}
            </button>
          ) : (
            <button
              type="button"
              disabled={!hasValidAmounts || isSupplyPending || isSupplyConfirming}
              onClick={handleSupply}
              className="btn-color w-full text-white font-semibold text-base md:text-[1.1vw] py-3 md:py-[0.8vw] rounded-2xl transition-all active:scale-[0.99] disabled:opacity-40"
            >
              {isSupplyPending ? 'Confirm in wallet...' : isSupplyConfirming ? 'Supplying...' : 'Supply'}
            </button>
          )}
        </div>
      </div>

      <p className="relative z-10 text-gray-400 text-xs md:text-[1vw] w-full max-w-[360px] md:max-w-[32vw] text-center mt-6 md:mt-[1.5vw] leading-relaxed">
        If this pair already has liquidity, your amounts are automatically adjusted to match the current price —
        the ratio you enter only sets the price for a brand-new pair.
      </p>

    </div>
  )
}

export default NewPoolPage
