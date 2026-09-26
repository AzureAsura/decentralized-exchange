'use client'

import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'

interface Token {
  symbol: string
  name: string
  icon?: React.ReactNode
  balance?: string
}

const TOKENS: Token[] = [
  { symbol: 'ETH', name: 'Ethereum', balance: '1.245' },
  { symbol: 'USDT', name: 'Tether USD', balance: '520.00' },
  { symbol: 'USDC', name: 'USD Coin', balance: '0.00' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', balance: '0.012' },
  { symbol: 'UNI', name: 'Uniswap', balance: '45.00' },
]

interface TokenSelectModalProps {
  trigger: React.ReactNode
  selectedToken?: string
  onSelectToken: (token: Token) => void
}

interface ModalContentProps {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  filteredTokens: Token[]
  selectedToken: string
  onSelect: (token: Token) => void
}

// ISI KONTEN UTAMA MODAL / DRAWER
const ModalContent: React.FC<ModalContentProps> = ({
  searchQuery,
  onSearchQueryChange,
  filteredTokens,
  selectedToken,
  onSelect,
}) => (
  <div className="flex flex-col gap-4 md:gap-[1.2vw] pt-2 md:pt-[0.5vw]">
    {/* INPUT SEARCH */}
    <div className="relative flex items-center">
      <Search className="absolute left-4 md:left-[1.2vw] w-5 h-5 md:w-[1.4vw] md:h-[1.4vw] text-gray-400 shrink-0 pointer-events-none" />
      <input
        type="text"
        placeholder="Search name or paste address"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="w-full bg-white/5 border border-transparent rounded-2xl md:rounded-[1vw] py-3.5 md:py-[0.8vw] pl-12 md:pl-[3.2vw] pr-4 text-base md:text-[1.1vw] text-white placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
      />
    </div>

    {/* LIST TOKEN BERBARIS KEBAWAH */}
    <div className="flex flex-col gap-1.5 md:gap-[0.4vw] max-h-[60vh] md:max-h-[380px] overflow-y-auto pr-1">
      {filteredTokens.map((token) => {
        const isSelected = selectedToken === token.symbol
        return (
          <button
            key={token.symbol}
            onClick={() => onSelect(token)}
            className={`flex items-center justify-between p-3.5 md:p-[1vw] rounded-2xl md:rounded-[1vw] transition-all duration-150 border border-transparent ${
              isSelected
                ? 'card-light  active:scale-[0.99]'
                : 'card  active:scale-[0.99] opacity-70'
            }`}
          >
            <div className="flex items-center gap-3.5 md:gap-[1vw]">
              <div className="w-10 h-10 md:w-[2.6vw] md:h-[2.6vw] rounded-full bg-white/10 flex items-center justify-center font-bold text-sm md:text-[1.1vw] text-white shrink-0">
                {token.symbol[0]}
              </div>

              {/* INFO TOKEN */}
              <div className="flex flex-col items-start">
                <span className="font-semibold text-base md:text-[1.15vw] text-white leading-tight">
                  {token.symbol}
                </span>
                <span className="text-gray-400 text-xs md:text-[0.9vw] leading-tight mt-0.5">
                  {token.name}
                </span>
              </div>
            </div>

            {/* BALANCE */}
            <div className="flex items-center gap-3 md:gap-[0.8vw]">
              {token.balance && (
                <span className="text-gray-300 text-sm md:text-[1vw] font-medium">
                  {token.balance}
                </span>
              )}
            </div>
          </button>
        )
      })}

      {filteredTokens.length === 0 && (
        <div className="text-center py-8 md:py-[3vw] text-gray-400 text-sm md:text-[1vw]">
          No tokens found.
        </div>
      )}
    </div>
  </div>
)

export const TokenSelectModal: React.FC<TokenSelectModalProps> = ({
  trigger,
  selectedToken = 'ETH',
  onSelectToken,
}) => {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const filteredTokens = TOKENS.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelect = (token: Token) => {
    onSelectToken(token)
    setOpen(false)
  }

  // DESKTOP DIALOG
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={trigger as React.ReactElement} />
        <DialogContent className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white max-w-[34vw] min-w-[420px] rounded-[1.8vw] p-[1.5vw] shadow-2xl">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-[1.4vw] font-semibold text-white tracking-tight">
              Select a token
            </DialogTitle>
          </DialogHeader>
          <ModalContent
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            filteredTokens={filteredTokens}
            selectedToken={selectedToken}
            onSelect={handleSelect}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // MOBILE DRAWER
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger as React.ReactElement} />
      <DrawerContent className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white rounded-t-[28px] px-5 pb-8 pt-3 max-h-[85vh]">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20 mb-4" />
        <DrawerHeader className="p-0 pb-2 text-left">
          <DrawerTitle className="text-xl font-semibold text-white">
            Select a token
          </DrawerTitle>
        </DrawerHeader>
        <ModalContent
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          filteredTokens={filteredTokens}
          selectedToken={selectedToken}
          onSelect={handleSelect}
        />
      </DrawerContent>
    </Drawer>
  )
}