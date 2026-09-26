'use client'

import React, { useState } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useSettings } from '@/hooks/use-settings'
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

interface SettingsModalProps {
  trigger: React.ReactNode
}

const SLIPPAGE_PRESETS_BPS = [10, 50, 100] // 0.1% / 0.5% / 1%

const bpsToPercentLabel = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`

interface ModalContentProps {
  slippageBps: number
  setSlippageBps: (bps: number) => void
  deadlineMinutes: number
  setDeadlineMinutes: (minutes: number) => void
}

// ISI KONTEN UTAMA MODAL / DRAWER
const ModalContent: React.FC<ModalContentProps> = ({
  slippageBps,
  setSlippageBps,
  deadlineMinutes,
  setDeadlineMinutes,
}) => {
  const isCustomSlippage = !SLIPPAGE_PRESETS_BPS.includes(slippageBps)
  const [customSlippage, setCustomSlippage] = useState(isCustomSlippage ? bpsToPercentLabel(slippageBps) : '')

  const handleCustomChange = (value: string) => {
    setCustomSlippage(value)
    const parsed = Number(value)
    if (!Number.isNaN(parsed) && parsed > 0) setSlippageBps(Math.round(parsed * 100))
  }

  return (
    <div className="flex flex-col gap-5 md:gap-[1.2vw] pt-2 md:pt-[0.5vw]">
      <div>
        <span className="text-gray-400 text-xs md:text-[0.9vw] font-medium block mb-2 md:mb-[0.5vw]">
          Slippage tolerance
        </span>
        <div className="flex gap-2 md:gap-[0.5vw]">
          {SLIPPAGE_PRESETS_BPS.map((bps) => (
            <button
              key={bps}
              type="button"
              onClick={() => {
                setSlippageBps(bps)
                setCustomSlippage('')
              }}
              className={`flex-1 py-2 md:py-[0.55vw] rounded-xl text-sm md:text-[0.95vw] font-semibold transition-all ${
                slippageBps === bps && !isCustomSlippage ? 'btn-color text-white' : 'card text-gray-400 hover:text-white'
              }`}
            >
              {bpsToPercentLabel(bps)}
            </button>
          ))}
          <div
            className={`flex-1 flex items-center gap-1 px-2 rounded-xl ${
              isCustomSlippage ? 'card-dark border border-blue-500/50' : 'card'
            }`}
          >
            <input
              type="text"
              value={customSlippage}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="Custom"
              className="bg-transparent outline-none w-full text-sm md:text-[0.95vw] text-white placeholder-gray-500 text-center"
            />
            <span className="text-gray-400 text-sm md:text-[0.95vw]">%</span>
          </div>
        </div>
      </div>

      <div>
        <span className="text-gray-400 text-xs md:text-[0.9vw] font-medium block mb-2 md:mb-[0.5vw]">
          Transaction deadline
        </span>
        <div className="flex items-center gap-2 card rounded-xl px-3 py-2 md:px-[0.9vw] md:py-[0.55vw]">
          <input
            type="text"
            value={deadlineMinutes}
            onChange={(e) => {
              const parsed = Number(e.target.value)
              if (!Number.isNaN(parsed) && parsed > 0) setDeadlineMinutes(Math.round(parsed))
            }}
            className="bg-transparent outline-none w-full text-sm md:text-[0.95vw] text-white"
          />
          <span className="text-gray-400 text-sm md:text-[0.95vw] shrink-0">minutes</span>
        </div>
      </div>
    </div>
  )
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { slippageBps, setSlippageBps, deadlineMinutes, setDeadlineMinutes } = useSettings()

  const contentProps = { slippageBps, setSlippageBps, deadlineMinutes, setDeadlineMinutes }

  // DESKTOP DIALOG
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={trigger as React.ReactElement} />
        <DialogContent className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white max-w-[28vw] min-w-[380px] rounded-[1.8vw] p-[1.5vw] shadow-2xl">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-[1.3vw] font-semibold text-white tracking-tight">Settings</DialogTitle>
          </DialogHeader>
          <ModalContent {...contentProps} />
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
          <DrawerTitle className="text-xl font-semibold text-white">Settings</DrawerTitle>
        </DrawerHeader>
        <ModalContent {...contentProps} />
      </DrawerContent>
    </Drawer>
  )
}
