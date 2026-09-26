'use client'

import { erc20Abi } from 'viem'
import { useReadContract } from 'wagmi'
import { ROUTER_ADDRESS, type Asset } from '@/lib/contracts'

export function useAllowance(asset: Asset, owner: `0x${string}` | undefined, requiredAmount: bigint | undefined) {
    const { data: allowance, refetch } = useReadContract({
        address: asset.address ?? undefined,
        abi: erc20Abi,
        functionName: 'allowance',
        args: owner && asset.address ? [owner, ROUTER_ADDRESS] : undefined,
        query: { enabled: Boolean(owner) && asset.address !== null },
    })

    const needsApproval =
        asset.address !== null &&
        requiredAmount !== undefined &&
        (allowance === undefined || allowance < requiredAmount)

    return { needsApproval, refetch }
}
