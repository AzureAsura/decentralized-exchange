'use client'

import React, { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useAccount, useConnect, type Connector } from 'wagmi'
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

interface ConnectWalletModalProps {
  trigger: React.ReactNode
}

interface ModalContentProps {
  connectors: readonly Connector[]
  onSelect: (connector: Connector) => void
  pendingConnectorId?: string
  error: Error | null
}

const ModalContent: React.FC<ModalContentProps> = ({
  connectors,
  onSelect,
  pendingConnectorId,
  error,
}) => (
  <div className="flex flex-col gap-3 md:gap-[1.2vw] pt-2 md:pt-[0.5vw]">
    <div className="flex flex-col gap-2 md:gap-[0.4vw]">
      {connectors.map((connector) => {
        const isPendingThis = pendingConnectorId === connector.uid
        return (
          <button
            key={connector.uid}
            onClick={() => onSelect(connector)}
            disabled={isPendingThis}
            className="flex items-center gap-3 md:gap-[1vw] p-3 md:p-[1vw] rounded-xl md:rounded-[1vw] transition-all duration-150 border border-transparent card active:scale-[0.99] disabled:opacity-60 w-full"
          >
            <div className="w-8 h-8 md:w-[2.6vw] md:h-[2.6vw] rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
              {connector.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={connector.icon} alt="" className="w-5 h-5 md:w-[1.5vw] md:h-[1.5vw]" />
              ) : (
                <Wallet className="w-4 h-4 md:w-[1.3vw] md:h-[1.3vw] text-white" />
              )}
            </div>
            <span className="font-semibold text-sm md:text-[1.1vw] text-white">
              {connector.name}
            </span>
            {isPendingThis && (
              <span className="ml-auto text-gray-400 text-xs md:text-[0.85vw]">Connecting...</span>
            )}
          </button>
        )
      })}
    </div>

    {error && (
      <p className="text-red-400 text-xs md:text-[0.85vw] text-center">
        Failed to connect — please try again.
      </p>
    )}

    <a
      href="https://metamask.io/download"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 text-xs md:text-[0.9vw] text-center hover:underline pt-1"
    >
      Don&apos;t have a wallet? Install MetaMask
    </a>
  </div>
)

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | undefined>(undefined)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { isConnected } = useAccount()
  const { connectors, connect, isPending, error } = useConnect()

  const isOpen = open && !isConnected

  const handleSelect = (connector: Connector) => {
    setPendingId(connector.uid)
    connect({ connector })
  }

  const pendingConnectorId = isPending ? pendingId : undefined

  // DESKTOP DIALOG
  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogTrigger render={trigger as React.ReactElement} />
        <DialogContent className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white max-w-[34vw] min-w-[420px] rounded-[1.8vw] p-[1.5vw] shadow-2xl">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-[1.4vw] font-semibold text-white tracking-tight">
              Connect a wallet
            </DialogTitle>
          </DialogHeader>
          <ModalContent
            connectors={connectors}
            onSelect={handleSelect}
            pendingConnectorId={pendingConnectorId}
            error={error}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // MOBILE DRAWER
  return (
    <Drawer open={isOpen} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger as React.ReactElement} />
      <DrawerContent className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white rounded-t-[28px] px-4 pb-8 pt-3 max-h-[85vh]">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20 mb-4" />
        <DrawerHeader className="p-0 pb-2 text-left">
          <DrawerTitle className="text-lg font-semibold text-white">Connect a wallet</DrawerTitle>
        </DrawerHeader>
        <ModalContent
          connectors={connectors}
          onSelect={handleSelect}
          pendingConnectorId={pendingConnectorId}
          error={error}
        />
      </DrawerContent>
    </Drawer>
  )
}