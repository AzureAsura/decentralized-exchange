'use client'

import { erc20Abi } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { pairAbi } from '@/lib/contracts'

export function usePairPosition(pairAddress: `0x${string}` | undefined) {
    const { address } = useAccount()
    const enabled = Boolean(pairAddress)

    const { data: reservesData, isLoading: isLoadingReserves } = useReadContract({
        address: pairAddress,
        abi: pairAbi,
        functionName: 'getReserves',
        query: { enabled },
    })

    const { data: token0 } = useReadContract({
        address: pairAddress,
        abi: pairAbi,
        functionName: 'token0',
        query: { enabled },
    })

    const { data: token1 } = useReadContract({
        address: pairAddress,
        abi: pairAbi,
        functionName: 'token1',
        query: { enabled },
    })

    const { data: symbol0 } = useReadContract({
        address: token0,
        abi: erc20Abi,
        functionName: 'symbol',
        query: { enabled: Boolean(token0) },
    })

    const { data: symbol1 } = useReadContract({
        address: token1,
        abi: erc20Abi,
        functionName: 'symbol',
        query: { enabled: Boolean(token1) },
    })

    const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
        address: pairAddress,
        abi: erc20Abi,
        functionName: 'totalSupply',
        query: { enabled },
    })

    const { data: userLpBalance, refetch: refetchLpBalance } = useReadContract({
        address: pairAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: enabled && Boolean(address) },
    })

    const reserve0 = reservesData?.[0]
    const reserve1 = reservesData?.[1]

    const pooled0 =
        totalSupply !== undefined && totalSupply > BigInt(0) && userLpBalance !== undefined && reserve0 !== undefined
            ? (userLpBalance * reserve0) / totalSupply
            : BigInt(0)
    const pooled1 =
        totalSupply !== undefined && totalSupply > BigInt(0) && userLpBalance !== undefined && reserve1 !== undefined
            ? (userLpBalance * reserve1) / totalSupply
            : BigInt(0)

    return {
        isLoading: isLoadingReserves,
        token0,
        token1,
        symbol0: symbol0 ?? '?',
        symbol1: symbol1 ?? '?',
        reserve0,
        reserve1,
        totalSupply,
        userLpBalance,
        pooled0,
        pooled1,
        refetchPosition: () => {
            refetchTotalSupply()
            refetchLpBalance()
        },
    }
}
