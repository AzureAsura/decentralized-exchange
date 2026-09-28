'use client'
import React from 'react'
import Link from 'next/link'
import { formatUnits } from 'viem'
import { Wallet } from 'lucide-react'
import { usePools } from '@/hooks/use-pools'
import { useImportedTokens } from '@/hooks/use-imported-tokens'
import { TokenIcon } from '@/components/shared/TokenIcon'
import { findLogoUrl } from '@/lib/contracts'
import { formatAmount } from '@/lib/format'

export type PoolFilter = 'all' | 'mine'

interface PoolTableProps {
    searchQuery?: string
    filter?: PoolFilter
}

// Jumlah baris skeleton pas loading — konstan, biar nggak keliatan lompat-lompat (4 di satu momen,
// 7 di momen lain). Ganti angka ini aja kalau mau beda jumlah baris.
const SKELETON_ROW_COUNT = 4

// Placeholder 1 baris tabel, bentuknya niru row asli (2 lingkaran icon overlap + bar teks pair,
// bar kanan buat reserves, bar kanan buat price) — biar nggak ada layout shift pas data beneran
// masuk, ganti "Loading pools..." teks polos yang sebelumnya kepake.
const PoolRowSkeleton: React.FC = () => (
    <div className="card grid grid-cols-[2fr_1.5fr_1.5fr] items-center rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] border border-transparent animate-pulse">
        <div className="flex items-center gap-3 md:gap-[0.7vw]">
            <div className="flex items-center">
                <div className="w-8 h-8 md:w-[2vw] md:h-[2vw] rounded-full bg-white/10 ring-2 ring-[#0B0E17]" />
                <div className="w-8 h-8 md:w-[2vw] md:h-[2vw] rounded-full bg-white/10 ring-2 ring-[#0B0E17] -ml-2.5 md:-ml-[0.7vw]" />
            </div>
            <div className="h-4 md:h-[1.05vw] w-24 md:w-[6vw] rounded-full bg-white/10" />
        </div>
        <div className="flex justify-end">
            <div className="h-3.5 md:h-[0.95vw] w-28 md:w-[7vw] rounded-full bg-white/10" />
        </div>
        <div className="flex justify-end">
            <div className="h-3.5 md:h-[0.95vw] w-24 md:w-[6vw] rounded-full bg-white/10" />
        </div>
    </div>
)

export const PoolTable: React.FC<PoolTableProps> = ({ searchQuery = '', filter = 'all' }) => {
    const { pools, isLoading } = usePools()
    const { importedTokens } = useImportedTokens()

    const query = searchQuery.trim().toLowerCase()
    const filteredPools = pools
        .filter((p) => !query || p.symbol0.toLowerCase().includes(query) || p.symbol1.toLowerCase().includes(query))
        .filter((p) => filter !== 'mine' || p.userLpBalance > BigInt(0))

    return (
        <div className="card relative z-10 w-full max-w-[420px] md:max-w-none md:w-[68vw] md:min-w-[520px] rounded-3xl md:rounded-[1.6vw] p-2 md:p-[0.55vw] transition-all duration-300 overflow-hidden">

            <div className="w-full overflow-x-auto scrollbar-none">
                <div className="min-w-[520px] md:min-w-full flex flex-col gap-1.5 md:gap-[0.4vw]">

                    <div className="grid grid-cols-[2fr_1.5fr_1.5fr] items-center px-4 md:px-[1.4vw] py-2 md:py-[0.6vw] text-gray-400 text-xs md:text-[0.85vw] font-medium">
                        <span>Pool</span>
                        <span className="text-right">Reserves</span>
                        <span className="text-right">Price</span>
                    </div>

                    {isLoading ? (
                        Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => <PoolRowSkeleton key={i} />)
                    ) : (
                        <>
                            {filteredPools.map((pool) =>
                                pool.symbol0 === '?' || pool.symbol1 === '?' ? (
                                    <PoolRowSkeleton key={pool.address} />
                                ) : (
                                    <Link
                                        key={pool.address}
                                        href={`/liquidity/${pool.address}`}
                                        className="card grid grid-cols-[2fr_1.5fr_1.5fr] items-center rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] border border-transparent hover:bg-white/5 transition-colors cursor-pointer"
                                    >

                                        <div className="flex items-center gap-3 md:gap-[0.7vw]">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 md:w-[2vw] md:h-[2vw] rounded-full bg-white/10 flex items-center justify-center ring-2 ring-[#0B0E17] overflow-hidden">
                                                    <TokenIcon symbol={pool.symbol0} imageUrl={findLogoUrl(pool.symbol0, importedTokens)} className="w-8 h-8 md:w-[2vw] md:h-[2vw]" />
                                                </div>
                                                <div className="w-8 h-8 md:w-[2vw] md:h-[2vw] rounded-full bg-white/10 flex items-center justify-center ring-2 ring-[#0B0E17] overflow-hidden -ml-2.5 md:-ml-[0.7vw]">
                                                    <TokenIcon symbol={pool.symbol1} imageUrl={findLogoUrl(pool.symbol1, importedTokens)} className="w-8 h-8 md:w-[2vw] md:h-[2vw]" />
                                                </div>
                                            </div>
                                            <span className="font-semibold text-sm md:text-[1.05vw] tracking-tight text-white">
                                                {pool.symbol0} / {pool.symbol1}
                                            </span>
                                            {pool.userLpBalance > BigInt(0) && (
                                                <span
                                                    title="You have a position in this pool"
                                                    className="flex items-center justify-center w-5 h-5 md:w-[1.3vw] md:h-[1.3vw] shrink-0 rounded-full text-blue-400 bg-blue-500/10 border border-blue-500/20"
                                                >
                                                    <Wallet className="w-3 h-3 md:w-[0.75vw] md:h-[0.75vw]" />
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs md:text-[0.95vw] text-gray-300 text-right font-medium">
                                            {formatAmount(pool.reserve0, 4)} {pool.symbol0} · {formatAmount(pool.reserve1, 4)} {pool.symbol1}
                                        </div>

                                        <div className="text-xs md:text-[0.95vw] text-gray-300 text-right font-medium">
                                            {pool.reserve0 > BigInt(0)
                                                ? `1 ${pool.symbol0} ≈ ${(Number(formatUnits(pool.reserve1, 18)) / Number(formatUnits(pool.reserve0, 18))).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${pool.symbol1}`
                                                : '—'}
                                        </div>
                                    </Link>
                                )
                            )}

                            {filteredPools.length === 0 && (
                                <div className="text-center py-8 md:py-[3vw] text-gray-400 text-sm md:text-[1vw]">
                                    {query
                                        ? 'No pools match your search.'
                                        : filter === 'mine'
                                          ? "You don't have any positions yet."
                                          : 'No pools yet.'}
                                </div>
                            )}
                        </>
                    )}

                </div>
            </div>
        </div>
    )
}
