import { ROUTER_ADDRESS, WBNB_ADDRESS, routerAbi, type Asset } from './contracts'

export const resolvePathAddress = (asset: Asset): `0x${string}` => asset.address ?? WBNB_ADDRESS

export const applySlippageMin = (amountOut: bigint, slippageBps: bigint) =>
    (amountOut * (BigInt(10000) - slippageBps)) / BigInt(10000)

export const applySlippageMax = (amountIn: bigint, slippageBps: bigint) =>
    (amountIn * (BigInt(10000) + slippageBps)) / BigInt(10000)

interface BuildSwapRequestParams {
    activeSide: 'sell' | 'buy'
    sellAsset: Asset
    buyAsset: Asset
    // Bisa lebih dari 2 elemen sekarang (multi-hop routing, lihat hooks/use-swap-route.ts) — Router
    // udah dari awal nerima path: address[] (arbitrary length), cuma tipe TS-nya yang perlu dilonggarin.
    path: readonly `0x${string}`[]
    to: `0x${string}`
    deadline: bigint
    amountOutMin: bigint | undefined
    amountInMax: bigint | undefined
    parsedSellAmount: bigint | undefined
    parsedBuyAmount: bigint | undefined
}

export function buildSwapRequest({
    activeSide,
    sellAsset,
    buyAsset,
    path,
    to,
    deadline,
    amountOutMin,
    amountInMax,
    parsedSellAmount,
    parsedBuyAmount,
}: BuildSwapRequestParams) {
    const isSellNative = sellAsset.address === null
    const isBuyNative = buyAsset.address === null

    if (activeSide === 'sell') {
        if (amountOutMin === undefined || parsedSellAmount === undefined) return undefined
        if (isSellNative) {
            return {
                address: ROUTER_ADDRESS,
                abi: routerAbi,
                functionName: 'swapExactETHForTokens',
                args: [amountOutMin, path, to, deadline],
                value: parsedSellAmount,
            } as const
        }
        if (isBuyNative) {
            return {
                address: ROUTER_ADDRESS,
                abi: routerAbi,
                functionName: 'swapExactTokensForETH',
                args: [parsedSellAmount, amountOutMin, path, to, deadline],
            } as const
        }
        return {
            address: ROUTER_ADDRESS,
            abi: routerAbi,
            functionName: 'swapExactTokensForTokens',
            args: [parsedSellAmount, amountOutMin, path, to, deadline],
        } as const
    }

    if (amountInMax === undefined || parsedBuyAmount === undefined) return undefined
    if (isSellNative) {
        return {
            address: ROUTER_ADDRESS,
            abi: routerAbi,
            functionName: 'swapETHForExactTokens',
            args: [parsedBuyAmount, path, to, deadline],
            value: amountInMax,
        } as const
    }
    if (isBuyNative) {
        return {
            address: ROUTER_ADDRESS,
            abi: routerAbi,
            functionName: 'swapTokensForExactETH',
            args: [parsedBuyAmount, amountInMax, path, to, deadline],
        } as const
    }
    return {
        address: ROUTER_ADDRESS,
        abi: routerAbi,
        functionName: 'swapTokensForExactTokens',
        args: [parsedBuyAmount, amountInMax, path, to, deadline],
    } as const
}
