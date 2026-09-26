'use client'

import { erc20Abi } from 'viem'
import { useBalance, useReadContract } from 'wagmi'
import type { Asset } from '@/lib/contracts'

export function useAssetBalance(asset: Asset, address: `0x${string}` | undefined) {
  const isNative = asset.address === null

  const { data: nativeBalance } = useBalance({
    address,
    query: { enabled: Boolean(address) && isNative },
  })

  const { data: tokenBalance } = useReadContract({
    address: asset.address ?? undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && !isNative },
  })

  if (isNative) {
    return nativeBalance ? { value: nativeBalance.value, decimals: nativeBalance.decimals } : undefined
  }
  return tokenBalance !== undefined ? { value: tokenBalance, decimals: 18 } : undefined
}
