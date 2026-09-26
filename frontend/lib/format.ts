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

// Buat string desimal yang udah jadi (mis. formatUnits full-precision, bisa sampai 18 digit) —
// dipotong buat tampilan doang, bukan buat dipakai ulang sebagai angka presisi.
export const truncateDisplayAmount = (value: string, maxDigits = 6) => {
    if (!value) return value
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return value
    return parsed.toLocaleString(undefined, { maximumFractionDigits: maxDigits, useGrouping: false })
}
