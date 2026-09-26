'use client'

import React, { useState } from 'react'
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
import { TokenIcon } from '@/components/TokenIcon'
import type { Asset } from '@/lib/contracts'

interface AssetSelectModalProps {
  trigger: React.ReactNode
  assets: Asset[]
  excludeSymbol: string
  onSelect: (asset: Asset) => void
}

interface ModalContentProps {
  assets: Asset[]
  onSelect: (asset: Asset) => void
}

// ISI KONTEN UTAMA MODAL / DRAWER
const ModalContent: React.FC<ModalContentProps> = ({ assets, onSelect }) => (
  <div className="flex flex-col gap-1.5 md:gap-[0.4vw] pt-2 md:pt-[0.5vw]">
    {assets.map((asset) => (
      <button
        key={asset.symbol}
        onClick={() => onSelect(asset)}
        className="flex items-center gap-3.5 md:gap-[1vw] p-3.5 md:p-[1vw] rounded-2xl md:rounded-[1vw] transition-all duration-150 border border-transparent card active:scale-[0.99]"
      >
        <div className="w-10 h-10 md:w-[2.6vw] md:h-[2.6vw] rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
          <TokenIcon symbol={asset.symbol} className="w-10 h-10 md:w-[2.6vw] md:h-[2.6vw]" />
        </div>
        <div className="flex flex-col items-start">
          <span className="font-semibold text-base md:text-[1.15vw] text-white leading-tight">{asset.symbol}</span>
          <span className="text-gray-400 text-xs md:text-[0.9vw] leading-tight mt-0.5">{asset.name}</span>
        </div>
      </button>
    ))}
  </div>
)

export const AssetSelectModal: React.FC<AssetSelectModalProps> = ({ trigger, assets, excludeSymbol, onSelect }) => {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const filteredAssets = assets.filter((a) => a.symbol !== excludeSymbol)

  const handleSelect = (asset: Asset) => {
    onSelect(asset)
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
          <ModalContent assets={filteredAssets} onSelect={handleSelect} />
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
          <DrawerTitle className="text-xl font-semibold text-white">Select a token</DrawerTitle>
        </DrawerHeader>
        <ModalContent assets={filteredAssets} onSelect={handleSelect} />
      </DrawerContent>
    </Drawer>
  )
}
