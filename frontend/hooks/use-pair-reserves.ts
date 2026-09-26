'use client'

import { useReadContract } from 'wagmi'
import { FACTORY_ADDRESS, factoryAbi, pairAbi } from '@/lib/contracts'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function usePairReserves(tokenA?: `0x${string}`, tokenB?: `0x${string}`) {
  const { data: pairAddress } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'getPair',
    args: tokenA && tokenB ? [tokenA, tokenB] : undefined,
    query: { enabled: Boolean(tokenA && tokenB) },
  })

  const pairExists = Boolean(pairAddress) && pairAddress !== ZERO_ADDRESS

  const { data: reservesData } = useReadContract({
    address: pairAddress,
    abi: pairAbi,
    functionName: 'getReserves',
    query: { enabled: pairExists },
  })

  const { data: pairToken0 } = useReadContract({
    address: pairAddress,
    abi: pairAbi,
    functionName: 'token0',
    query: { enabled: pairExists },
  })

  if (!pairExists || !reservesData || !pairToken0 || !tokenA) {
    return { exists: false as const, reserveA: undefined, reserveB: undefined }
  }

  const [reserve0, reserve1] = reservesData
  const isTokenAToken0 = pairToken0.toLowerCase() === tokenA.toLowerCase()

  return {
    exists: true as const,
    reserveA: isTokenAToken0 ? reserve0 : reserve1,
    reserveB: isTokenAToken0 ? reserve1 : reserve0,
  }
}
