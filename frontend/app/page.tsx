'use client'

import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { AssetSelectModal } from '@/components/shared/AssetSelectModal'
import { ConnectWalletModal } from '@/components/shared/ConnectWalletModal'
import { TokenIcon } from '@/components/shared/TokenIcon'
import { TokenSelectButton } from '@/components/shared/TokenSelectButton'
import { ASSETS } from '@/lib/contracts'
import { truncateDisplayAmount } from '@/lib/format'
import { useSwapPreview } from '@/hooks/use-swap-preview'


const FALLBACK_SHOWCASE_SYMBOLS = ['BTC', 'ETH', 'BNB', 'USDT', 'USDC', 'SOL', 'XRP', 'DOGE', 'ADA', 'LINK']

const ShowcaseTokenIcon: React.FC<{ symbol: string; imageUrl?: string; isLoading: boolean }> = ({
  symbol,
  imageUrl,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 xl:w-11 xl:h-11 rounded-full bg-white/10 border-2 border-[#1a1b23] xl:border-transparent shadow-md shrink-0 animate-pulse" />
    )
  }

  return (
    <div
      className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 xl:w-11 xl:h-11 rounded-full bg-white/10 border-2 border-[#1a1b23] xl:border-transparent flex items-center justify-center overflow-hidden shadow-md transition-all duration-200 hover:scale-125 hover:z-50 active:scale-95 shrink-0"
      title={symbol}
    >
      <TokenIcon symbol={symbol} imageUrl={imageUrl} className="w-full h-full text-xs sm:text-sm" />
    </div>
  )
}

const Page = () => {
  const { isConnected } = useAccount()

  const { data: topTokensData, isLoading: isLoadingShowcase } = useQuery({
    queryKey: ['top-tokens'],
    queryFn: async () => {
      const res = await fetch('/api/top-tokens')
      if (!res.ok) return { tokens: [] as { symbol: string; image: string | null }[] }
      return (await res.json()) as { tokens: { symbol: string; image: string | null }[] }
    },
    staleTime: Infinity,
  })

  const showcaseTokens =
    topTokensData && topTokensData.tokens.length > 0
      ? topTokensData.tokens
      : FALLBACK_SHOWCASE_SYMBOLS.map((symbol) => ({ symbol, image: null }))

  const {
    sellAsset,
    buyAsset,
    sellDisplay,
    buyDisplay,
    activeSide,
    setSellInput,
    setBuyInput,
    handleFocusSell,
    handleFocusBuy,
    handleSelectSellAsset,
    handleSelectBuyAsset,
  } = useSwapPreview()

  return (

    <div className="relative min-h-[85vh] md:min-h-screen w-full bg-transparent text-white flex flex-col justify-center items-center px-4 pt-28 pb-6 sm:px-6 md:px-8 xl:p-12 overflow-x-hidden select-none font-sans md:pt-20">

      <div className="w-full max-w-6xl xl:max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8 md:gap-8 xl:gap-12 items-center my-auto z-10">

        <div className="md:col-span-6 xl:col-span-7 flex flex-col justify-center text-center md:text-left space-y-3 sm:space-y-4 md:space-y-6">

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-4xl sm:text-6xl md:text-6xl xl:text-7xl 2xl:text-7xl font-black tracking-tighter leading-[0.98] select-none uppercase"
          >
            <span className="text-white block drop-shadow-md">
              Swap Tokens.
            </span>
            <span className="block drop-shadow-lg">
              Zero Hassle.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="text-gray-300 font-medium text-xs sm:text-lg md:text-xl xl:text-2xl tracking-tight leading-snug max-w-lg mx-auto md:mx-0 hidden xl:block"
          >
            Trade top assets instantly with zero app fees and deep liquidity on Nirmala Protocol.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="pt-1 sm:pt-2 w-full overflow-hidden"
          >
            <span className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wider block mb-2 sm:mb-3">
              Trade popular tokens
            </span>

            <div className="flex items-center justify-center md:justify-start -space-x-2 sm:-space-x-2.5 md:space-x-0 md:gap-2.5 xl:gap-3 overflow-x-auto no-scrollbar py-1 sm:py-2 px-1">
              {showcaseTokens.map(({ symbol, image }, index) => (
                <motion.div
                  key={symbol}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.05, ease: 'easeOut' }}
                  style={{ zIndex: showcaseTokens.length - index }}
                  className="shrink-0"
                >
                  <ShowcaseTokenIcon symbol={symbol} imageUrl={image ?? undefined} isLoading={isLoadingShowcase} />
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>

        <div className="md:col-span-6 xl:col-span-5 flex justify-center md:justify-end w-full pt-1 sm:pt-0">
          <motion.div
            initial={{ opacity: 0, x: 32, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="card relative w-full max-w-[360px] sm:max-w-[420px] md:max-w-none md:w-full xl:max-w-[440px] rounded-3xl p-2.5 sm:p-4 xl:p-5 shadow-2xl transition-all duration-300"
          >

            <div
              onClick={handleFocusSell}
              className={`rounded-2xl px-3.5 py-3 sm:px-4 sm:py-4 transition-all duration-300 cursor-text relative ${activeSide === 'sell'
                  ? 'card-dark border border-blue-500/50 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                  : 'card border border-transparent'
                }`}
            >
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span className="text-gray-400 text-xs sm:text-sm font-medium">
                  Sell
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center w-[55%]">
                  <input
                    type="text"
                    value={activeSide === 'sell' ? sellDisplay : truncateDisplayAmount(sellDisplay)}
                    onChange={(e) => setSellInput(e.target.value)}
                    onFocus={handleFocusSell}
                    placeholder="0.0"
                    className={`bg-transparent text-2xl sm:text-3xl xl:text-4xl font-bold outline-none w-full tracking-tight leading-none transition-colors placeholder-gray-600 ${activeSide === 'sell' ? 'text-white' : 'text-gray-500'
                      }`}
                  />
                </div>

                <AssetSelectModal
                  assets={ASSETS}
                  excludeSymbol={buyAsset?.symbol ?? ''}
                  onSelect={handleSelectSellAsset}
                  trigger={<TokenSelectButton symbol={sellAsset.symbol} imageUrl={sellAsset.logoUrl} />}
                />
              </div>

              <span className="text-gray-400 text-[11px] sm:text-sm font-normal block leading-none mt-1.5 sm:mt-2">
                $0
              </span>
            </div>

            {/* SWAP BUTTON */}
            <div className="relative h-2 flex items-center justify-center my-[-2px] z-20">
              <button
                onClick={() => (activeSide === 'sell' ? handleFocusBuy() : handleFocusSell())}
                className="btn-color text-white p-2 sm:p-3 rounded-xl transition-all duration-200 active:scale-90 hover:scale-105 shadow-[0_4px_15px_rgba(0,0,0,0.4)] flex items-center justify-center group"
                title="Swap direction"
              >
                <ArrowDown className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[2.5] transition-transform duration-300 group-hover:rotate-180" />
              </button>
            </div>

            {/* BUY CARD */}
            <div
              onClick={handleFocusBuy}
              className={`rounded-2xl px-3.5 py-3 sm:px-4 sm:py-4 transition-all duration-300 cursor-text relative ${activeSide === 'buy'
                  ? 'card-dark border border-blue-500/50 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                  : 'card border border-transparent'
                }`}
            >
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span className="text-gray-400 text-xs sm:text-sm font-medium">
                  Buy
                </span>
              </div>

              <div className="flex items-center justify-between min-h-[36px] sm:min-h-[40px] gap-2">
                <div className="flex items-center w-[45%]">
                  <input
                    type="text"
                    value={activeSide === 'buy' ? buyDisplay : truncateDisplayAmount(buyDisplay)}
                    onChange={(e) => setBuyInput(e.target.value)}
                    onFocus={handleFocusBuy}
                    placeholder="0.0"
                    className={`bg-transparent text-2xl sm:text-3xl xl:text-4xl font-bold outline-none w-full tracking-tight leading-none transition-colors ${activeSide === 'buy' ? 'text-white' : 'text-gray-500'
                      }`}
                  />
                </div>

                <AssetSelectModal
                  assets={ASSETS}
                  excludeSymbol={sellAsset.symbol}
                  onSelect={handleSelectBuyAsset}
                  trigger={
                    buyAsset ? (
                      <TokenSelectButton symbol={buyAsset.symbol} imageUrl={buyAsset.logoUrl} />
                    ) : (
                      <button className="btn-color flex items-center gap-2 text-white font-semibold py-1.5 px-3 sm:py-2 sm:px-3.5 rounded-full text-xs sm:text-sm transition-all duration-150 active:scale-95 tracking-tight shrink-0">
                        <span>Select token</span>
                        <svg className="w-3 h-3 text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )
                  }
                />
              </div>
              <span className="text-gray-400 text-[11px] sm:text-sm font-normal block leading-none mt-1.5 sm:mt-2">
                $0
              </span>
            </div>

            {/* GET STARTED BUTTON — belum connect wallet: buka ConnectWalletModal, udah connect: ke /trade */}
            {isConnected ? (
              <Link
                href="/trade"
                className="btn-color w-full mt-2.5 sm:mt-4 text-white font-semibold text-sm sm:text-lg py-3 sm:py-4 rounded-2xl transition-all active:scale-[0.99] tracking-tight flex items-center justify-center text-center select-none"
              >
                Get started
              </Link>
            ) : (
              <ConnectWalletModal
                trigger={
                  <button
                    type="button"
                    className="btn-color w-full mt-2.5 sm:mt-4 text-white font-semibold text-sm sm:text-lg py-3 sm:py-4 rounded-2xl transition-all active:scale-[0.99] tracking-tight flex items-center justify-center text-center select-none"
                  >
                    Get started
                  </button>
                }
              />
            )}
          </motion.div>
        </div>

      </div>
    </div>
  )
}

export default Page