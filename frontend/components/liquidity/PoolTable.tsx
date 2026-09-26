'use client'
import React from 'react'
import { formatUnits } from 'viem'
import { usePools } from '@/hooks/use-pools'
import { TokenIcon } from '@/components/shared/TokenIcon'
import { formatAmount } from '@/lib/format'

export const PoolTable: React.FC = () => {
    const { pools, isLoading } = usePools()

    return (
        <div className="card relative z-10 w-full max-w-[420px] md:max-w-none md:w-[48vw] md:min-w-[520px] rounded-3xl md:rounded-[1.6vw] p-2 md:p-[0.55vw] transition-all duration-300 overflow-hidden">

            {/* WRAPPER SCROLL HORIZONTAL (Untuk Mobile/Tablet) */}
            <div className="w-full overflow-x-auto scrollbar-none">
                <div className="min-w-[520px] md:min-w-full flex flex-col gap-1.5 md:gap-[0.4vw]">

                    {/* HEADER TABEL */}
                    <div className="grid grid-cols-[2fr_1.5fr_1.5fr] items-center px-4 md:px-[1.4vw] py-2 md:py-[0.6vw] text-gray-400 text-xs md:text-[0.85vw] font-medium">
                        <span>Pool</span>
                        <span className="text-right">Reserves</span>
                        <span className="text-right">Price</span>
                    </div>

                    {/* ROWS / ISI TABEL */}
                    {pools.map((pool) => (
                        <div
                            key={pool.address}
                            className="card grid grid-cols-[2fr_1.5fr_1.5fr] items-center rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] border border-transparent"
                        >
                            {/* PAIR */}
                            <div className="flex items-center gap-3 md:gap-[0.7vw]">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 md:w-[2vw] md:h-[2vw] rounded-full bg-white/10 flex items-center justify-center ring-2 ring-[#0B0E17] overflow-hidden">
                                        <TokenIcon symbol={pool.symbol0} className="w-8 h-8 md:w-[2vw] md:h-[2vw]" />
                                    </div>
                                    <div className="w-8 h-8 md:w-[2vw] md:h-[2vw] rounded-full bg-white/10 flex items-center justify-center ring-2 ring-[#0B0E17] overflow-hidden -ml-2.5 md:-ml-[0.7vw]">
                                        <TokenIcon symbol={pool.symbol1} className="w-8 h-8 md:w-[2vw] md:h-[2vw]" />
                                    </div>
                                </div>
                                <span className="font-semibold text-sm md:text-[1.05vw] tracking-tight text-white">
                                    {pool.symbol0} / {pool.symbol1}
                                </span>
                            </div>

                            {/* RESERVES */}
                            <div className="text-xs md:text-[0.95vw] text-gray-300 text-right font-medium">
                                {formatAmount(pool.reserve0, 4)} {pool.symbol0} · {formatAmount(pool.reserve1, 4)} {pool.symbol1}
                            </div>

                            {/* PRICE */}
                            <div className="text-xs md:text-[0.95vw] text-gray-300 text-right font-medium">
                                {pool.reserve0 > BigInt(0)
                                    ? `1 ${pool.symbol0} ≈ ${(Number(formatUnits(pool.reserve1, 18)) / Number(formatUnits(pool.reserve0, 18))).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${pool.symbol1}`
                                    : '—'}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="text-center py-8 md:py-[3vw] text-gray-400 text-sm md:text-[1vw]">
                            Loading pools...
                        </div>
                    )}

                    {!isLoading && pools.length === 0 && (
                        <div className="text-center py-8 md:py-[3vw] text-gray-400 text-sm md:text-[1vw]">
                            No pools yet.
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
