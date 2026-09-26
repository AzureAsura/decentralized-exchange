import { formatUnits, parseEther } from 'viem'

export const safeParseEther = (value: string): bigint | undefined => {
    if (!value || Number.isNaN(Number(value)) || Number(value) <= 0) return undefined
    try {
        return parseEther(value)
    } catch {
        return undefined
    }
}

export const formatAmount = (value: bigint, maxDigits = 6) =>
    Number(formatUnits(value, 18)).toLocaleString(undefined, { maximumFractionDigits: maxDigits })
