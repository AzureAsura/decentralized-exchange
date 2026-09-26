'use client'

import { useAccount, useSwitchChain } from 'wagmi'
import { bscTestnet } from 'wagmi/chains'

export function useCorrectNetwork() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending, error } = useSwitchChain()

  const isWrongNetwork = isConnected && chainId !== bscTestnet.id

  return {
    isWrongNetwork,
    isSwitching: isPending,
    switchError: error,
    switchToCorrectNetwork: () => switchChain({ chainId: bscTestnet.id }),
  }
}
