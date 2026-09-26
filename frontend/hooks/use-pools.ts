'use client'

import { useMemo } from 'react'
import { erc20Abi } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { FACTORY_ADDRESS, factoryAbi, pairAbi } from '@/lib/contracts'

export interface OnChainPool {
  address: `0x${string}`
  token0: `0x${string}`
  token1: `0x${string}`
  symbol0: string
  symbol1: string
  reserve0: bigint
  reserve1: bigint
}

export function usePools() {
  // Tahap 1: berapa banyak pair yang tercatat di Factory
  const { data: pairCount, isLoading: isLoadingCount } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'allPairsLength',
  })
  const count = pairCount ? Number(pairCount) : 0

  // Tahap 2: alamat tiap pair
  const { data: pairAddressResults, isLoading: isLoadingAddresses } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: 'allPairs',
      args: [BigInt(i)] as const,
    })),
    query: { enabled: count > 0 },
  })

  const addresses = useMemo(
    () =>
      (pairAddressResults ?? [])
        .map((r) => r.result as `0x${string}` | undefined)
        .filter((a): a is `0x${string}` => Boolean(a)),
    [pairAddressResults]
  )

  // Tahap 3: reserve + token0/token1 tiap pair (1 multicall, 3 call per pair)
  const { data: details, isLoading: isLoadingDetails } = useReadContracts({
    contracts: addresses.flatMap((pairAddress) => [
      { address: pairAddress, abi: pairAbi, functionName: 'getReserves' },
      { address: pairAddress, abi: pairAbi, functionName: 'token0' },
      { address: pairAddress, abi: pairAbi, functionName: 'token1' },
    ]),
    query: { enabled: addresses.length > 0 },
  })

  const partialPools = useMemo(() => {
    if (!details) return []
    return addresses.map((address, i) => {
      const [reserves, token0, token1] = details.slice(i * 3, i * 3 + 3)
      const r = reserves.result as [bigint, bigint, number] | undefined
      return {
        address,
        token0: (token0.result as `0x${string}`) ?? '0x0',
        token1: (token1.result as `0x${string}`) ?? '0x0',
        reserve0: r?.[0] ?? BigInt(0),
        reserve1: r?.[1] ?? BigInt(0),
      }
    })
  }, [addresses, details])

  // Tahap 4: symbol() tiap token0/token1
  const { data: symbolResults, isLoading: isLoadingSymbols } = useReadContracts({
    contracts: partialPools.flatMap((p) => [
      { address: p.token0, abi: erc20Abi, functionName: 'symbol' },
      { address: p.token1, abi: erc20Abi, functionName: 'symbol' },
    ]),
    query: { enabled: partialPools.length > 0 },
  })

  const pools: OnChainPool[] = useMemo(
    () =>
      partialPools.map((p, i) => ({
        ...p,
        symbol0: (symbolResults?.[i * 2]?.result as string | undefined) ?? '?',
        symbol1: (symbolResults?.[i * 2 + 1]?.result as string | undefined) ?? '?',
      })),
    [partialPools, symbolResults]
  )

  return {
    pools,
    isLoading:
      isLoadingCount || (count > 0 && (isLoadingAddresses || isLoadingDetails || isLoadingSymbols)),
  }
}
