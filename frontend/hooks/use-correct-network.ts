'use client'

import { toast } from 'sonner'
import { useAccount, useSwitchChain } from 'wagmi'
import { bscTestnet } from 'wagmi/chains'

export function useCorrectNetwork() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain({
    mutation: {
      onError: () => toast.error('Failed to switch network'),
    },
  })

  const isWrongNetwork = isConnected && chainId !== bscTestnet.id

  return {
    isWrongNetwork,
    isSwitching: isPending,
    switchToCorrectNetwork: () => switchChain({ chainId: bscTestnet.id }),
  }
}
