'use client'
import { ArrowDown } from 'lucide-react'
import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { TokenSelectModal } from '@/components/shared/TokenSelectModal'
import { ConnectWalletModal } from '@/components/shared/ConnectWalletModal'
import Link from 'next/link'

const Page = () => {
  const { isConnected } = useAccount()
  const [activeSide, setActiveSide] = useState<'sell' | 'buy'>('sell')
  const [sellValue, setSellValue] = useState('0')
  const [buyValue, setBuyValue] = useState('0')

  // State token yang dipilih
  const [sellToken, setSellToken] = useState('ETH')
  const [buyToken, setBuyToken] = useState<string | null>(null)

  return (
    <div className="relative min-h-screen w-full bg-transparent text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none p-4 md:p-[2vw]">
      
      {/* JUDUL UTAMA */}
      <h1 className="text-3xl md:text-[4.2vw] font-[550] tracking-[-0.03em] text-[#E0E0E0] mb-6 md:mb-[2vw] z-10 text-center drop-shadow-md">
        Swap anytime, anywhere.
      </h1>

      {/* CONTAINER WIDGET */}
      <div className="card relative z-10 w-full max-w-[420px] md:max-w-none md:w-[32vw] md:min-w-[340px] rounded-3xl md:rounded-[1.6vw] p-2 md:p-[0.55vw] transition-all duration-300">
        
        {/* SELL CARD */}
        <div
          onClick={() => setActiveSide('sell')}
          className={`rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] transition-all duration-300 cursor-text relative ${
            activeSide === 'sell'
              ? 'card-dark border border-blue-500/50 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
              : 'card border border-transparent '
          }`}
        >
          <div className="flex items-center justify-between mb-1 md:mb-[0.1vw]">
            <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium flex items-center gap-1 md:gap-[0.4vw]">
              Sell
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center w-[55%]">
              <input
                type="text"
                value={sellValue}
                onChange={(e) => setSellValue(e.target.value)}
                onFocus={() => setActiveSide('sell')}
                className={`bg-transparent text-3xl md:text-[2.8vw] font-bold outline-none w-full tracking-tight leading-none transition-colors ${
                  activeSide === 'sell' ? 'text-white' : 'text-gray-500'
                }`}
              />
            </div>

            {/* BUTTON SELL TOKEN (SELALU TERPILIH) */}
            <TokenSelectModal
              selectedToken={sellToken}
              onSelectToken={(token) => setSellToken(token.symbol)}
              trigger={
                <button className="flex items-center gap-2 md:gap-[0.5vw] card-light rounded-full py-1.5 md:py-[0.4vw] px-3 md:px-[0.9vw] backdrop-blur-md transition-all duration-150 active:scale-95 shrink-0">
                  <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full bg-white/10 flex items-center justify-center font-bold text-xs md:text-[0.9vw] text-white">
                    {sellToken === 'ETH' ? (
                      <svg className="w-3.5 h-3.5 md:w-[1vw] md:h-[1vw] fill-white" viewBox="0 0 784 1277">
                        <path d="M392.07 0L383.5 29.11V873.74L392.07 882.29L784.13 650.54L392.07 0Z" fillOpacity="0.602" />
                        <path d="M392.07 0L0 650.54L392.07 882.29V472.33V0Z" fillOpacity="0.6" />
                        <path d="M392.07 956.52L387.24 962.41V1271.67L392.07 1276.86L784.37 724.89L392.07 956.52Z" fillOpacity="0.602" />
                        <path d="M392.07 1276.86V956.52L0 724.89L392.07 1276.86Z" fillOpacity="0.6" />
                      </svg>
                    ) : (
                      sellToken[0]
                    )}
                  </div>
                  <span className="text-sm md:text-[1.1vw] font-[600] text-white tracking-tight">{sellToken}</span>
                  <svg className="w-3 h-3 md:w-[0.85vw] md:h-[0.85vw] text-gray-400 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              }
            />
          </div>

          <span className="text-gray-400 text-xs md:text-[1vw] font-normal block leading-none ml-0.5 md:ml-[0.1vw] mt-1 md:mt-0">
            $0
          </span>
        </div>

        {/* SWAP BUTTON */}
        <div className="relative h-2 md:h-[0.6vw] flex items-center justify-center -my-1 md:my-[-0.2vw] z-20">
          <div className="relative h-3 md:h-[0.8vw] flex items-center justify-center -my-1.5 md:my-[-0.35vw] z-20">
            <button
              onClick={() => setActiveSide((prev) => (prev === 'sell' ? 'buy' : 'sell'))}
              className="btn-color text-white p-2 md:p-[0.55vw] rounded-xl md:rounded-[0.9vw] transition-all duration-200 active:scale-90 hover:scale-105 shadow-[0_4px_15px_rgba(0,0,0,0.4)] flex items-center justify-center group"
              title="Swap direction"
            >
              <ArrowDown className="w-4 h-4 md:w-[1.2vw] md:h-[1.2vw] stroke-[2.5] transition-transform duration-300 group-hover:rotate-180" />
            </button>
          </div>
        </div>

        {/* BUY CARD */}
        <div
          onClick={() => setActiveSide('buy')}
          className={`rounded-2xl md:rounded-[1.2vw] px-4 md:px-[1.4vw] py-3 md:py-[0.9vw] transition-all duration-300 cursor-text relative mt-1 md:mt-[0.2vw] ${
            activeSide === 'buy'
              ? 'card-dark border border-blue-500/50 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
              : 'card border border-transparent'
          }`}
        >
          <div className="flex items-center justify-between mb-1 md:mb-[0.1vw]">
            <span className="text-gray-400 text-xs md:text-[0.95vw] font-medium flex items-center gap-1 md:gap-[0.4vw]">
              Buy
            </span>
          </div>

          <div className="flex items-center justify-between min-h-[40px] md:min-h-[3.2vw] gap-2">
            <div className="flex items-center w-[45%]">
              <input
                type="text"
                value={buyValue}
                onChange={(e) => setBuyValue(e.target.value)}
                onFocus={() => setActiveSide('buy')}
                className={`bg-transparent text-3xl md:text-[2.8vw] font-bold outline-none w-full tracking-tight leading-none transition-colors ${
                  activeSide === 'buy' ? 'text-white' : 'text-gray-500'
                }`}
              />
            </div>

            {/* BUTTON BUY TOKEN DENGAN KONDISIONAL DESIGN */}
            <TokenSelectModal
              selectedToken={buyToken || ''}
              onSelectToken={(token) => setBuyToken(token.symbol)}
              trigger={
                buyToken ? (
                  /* DESAIN JIKA TOKEN SUDAH DIPILIH (Sama persis seperti Sell Card) */
                  <button className="flex items-center gap-2 md:gap-[0.5vw] card-light rounded-full py-1.5 md:py-[0.4vw] px-3 md:px-[0.9vw] backdrop-blur-md transition-all duration-150 active:scale-95 shrink-0">
                    <div className="w-6 h-6 md:w-[1.6vw] md:h-[1.6vw] rounded-full bg-white/10 flex items-center justify-center font-bold text-xs md:text-[0.9vw] text-white">
                      {buyToken[0]}
                    </div>
                    <span className="text-sm md:text-[1.1vw] font-[600] text-white tracking-tight">{buyToken}</span>
                    <svg className="w-3 h-3 md:w-[0.85vw] md:h-[0.85vw] text-gray-400 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  /* DESAIN AWAL SAAT BELUM MEMILIH TOKEN */
                  <button className="btn-color flex items-center gap-2 md:gap-[0.5vw] text-white font-semibold py-2 md:py-[0.45vw] px-3.5 md:px-[1vw] rounded-full text-sm md:text-[1.1vw] transition-all duration-150 active:scale-95 tracking-tight shrink-0">
                    <span>Select token</span>
                    <svg className="w-3 h-3 md:w-[0.9vw] md:h-[0.9vw] text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )
              }
            />
          </div>
          <span className="text-gray-400 text-xs md:text-[1vw] font-normal block leading-none ml-0.5 md:ml-[0.1vw] mt-1 md:mt-0">
            $0
          </span>
        </div>

        {/* BUTTON ACTION */}

{isConnected ? (
  <Link
    href="/trade"
    className="btn-color w-full mt-2 md:mt-[0.4vw] text-white font-semibold text-base md:text-[1.15vw] py-3 md:py-[0.85vw] rounded-2xl md:rounded-[1.2vw] transition-all active:scale-[0.99] tracking-tight flex items-center justify-center text-center select-none"
  >
    Get started
  </Link>
) : (
  <ConnectWalletModal
    trigger={
      <button
        type="button"
        className="btn-color w-full mt-2 md:mt-[0.4vw] text-white font-semibold text-base md:text-[1.15vw] py-3 md:py-[0.85vw] rounded-2xl md:rounded-[1.2vw] transition-all active:scale-[0.99] tracking-tight flex items-center justify-center text-center select-none"
      >
        Get started
      </button>
    }
  />
)}
      </div>

      {/* FOOTER TEXT */}
      <p className="relative z-10 text-gray-400 text-xs md:text-[1.3vw] w-full max-w-[360px] md:max-w-[32vw] text-center mt-6 md:mt-[2vw] leading-relaxed tracking-tight font-normal drop-shadow-sm">
        Buy and sell crypto with <span className="text-blue-400 font-medium">zero app fees</span> on 23+ networks including Ethereum, Unichain, and Base.
      </p>

    </div>
  )
}

export default Page