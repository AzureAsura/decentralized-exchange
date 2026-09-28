'use client'

import { useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { FACTORY_ADDRESS, factoryAbi, pairAbi, type Asset } from '@/lib/contracts'
import { resolvePathAddress } from '@/lib/swap'
import { buildAdjacency, findSwapPath } from '@/lib/routing'

function useAllPairEdges() {
    const { data: pairCount, isLoading: isLoadingCount } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'allPairsLength',
    })
    const count = pairCount ? Number(pairCount) : 0

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

    const { data: tokenResults, isLoading: isLoadingTokens } = useReadContracts({
        contracts: addresses.flatMap((pairAddress) => [
            { address: pairAddress, abi: pairAbi, functionName: 'token0' },
            { address: pairAddress, abi: pairAbi, functionName: 'token1' },
        ]),
        query: { enabled: addresses.length > 0 },
    })

    const edges = useMemo(() => {
        if (!tokenResults) return []
        return addresses
            .map((_, i) => ({
                token0: tokenResults[i * 2]?.result as `0x${string}` | undefined,
                token1: tokenResults[i * 2 + 1]?.result as `0x${string}` | undefined,
            }))
            .filter((e): e is { token0: `0x${string}`; token1: `0x${string}` } => Boolean(e.token0 && e.token1))
    }, [addresses, tokenResults])

    return {
        edges,
        isLoading: isLoadingCount || (count > 0 && (isLoadingAddresses || isLoadingTokens)),
    }
}

export function useSwapRoute(sellAsset: Asset, buyAsset: Asset) {
    const { edges, isLoading } = useAllPairEdges()

    const sellAddr = resolvePathAddress(sellAsset)
    const buyAddr = resolvePathAddress(buyAsset)

    const path = useMemo(() => {
        if (sellAddr.toLowerCase() === buyAddr.toLowerCase()) return undefined
        const graph = buildAdjacency(edges)
        return findSwapPath(sellAddr, buyAddr, graph)
    }, [edges, sellAddr, buyAddr])

    return {
        path,
        routeExists: Boolean(path),
        isMultiHop: (path?.length ?? 0) > 2,
        isLoading,
    }
}
