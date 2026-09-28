'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { erc20Abi, isAddress } from 'viem'
import { useReadContracts } from 'wagmi'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useImportedTokens } from '@/hooks/use-imported-tokens'
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
import { TokenIcon } from '@/components/shared/TokenIcon'
import { WBNB_ADDRESS, type Asset } from '@/lib/contracts'

interface AssetSelectModalProps {
  trigger: React.ReactNode
  assets: Asset[]
  excludeSymbol: string
  onSelect: (asset: Asset) => void
}

const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

interface ImportTokenInputProps {
  knownAssets: Asset[]
  onImported: (asset: Asset) => void
}

const ImportTokenInput: React.FC<ImportTokenInputProps> = ({ knownAssets, onImported }) => {
  const [addressInput, setAddressInput] = useState('')
  const trimmed = addressInput.trim()
  const normalizedAddress = isAddress(trimmed) ? (trimmed as `0x${string}`) : undefined

  const isAlreadyKnown =
    normalizedAddress !== undefined &&
    [...knownAssets.map((a) => a.address), WBNB_ADDRESS].some(
      (a) => a?.toLowerCase() === normalizedAddress.toLowerCase()
    )

  const { data: tokenData, isFetching } = useReadContracts({
    contracts: normalizedAddress
      ? [
          { address: normalizedAddress, abi: erc20Abi, functionName: 'symbol' },
          { address: normalizedAddress, abi: erc20Abi, functionName: 'name' },
          { address: normalizedAddress, abi: erc20Abi, functionName: 'decimals' },
        ]
      : [],
    query: { enabled: Boolean(normalizedAddress) && !isAlreadyKnown },
  })

  const [symbolResult, nameResult, decimalsResult] = tokenData ?? []
  const fetchedSymbol = symbolResult?.status === 'success' ? (symbolResult.result as string) : undefined
  const fetchedName = nameResult?.status === 'success' ? (nameResult.result as string) : undefined
  const fetchedDecimals = decimalsResult?.status === 'success' ? (decimalsResult.result as number) : undefined
  const hasReadError = tokenData?.some((r) => r.status === 'failure') ?? false

  const symbolCollision =
    fetchedSymbol !== undefined && knownAssets.some((a) => a.symbol.toLowerCase() === fetchedSymbol.toLowerCase())

  const isReady =
    normalizedAddress !== undefined &&
    !isAlreadyKnown &&
    !hasReadError &&
    !symbolCollision &&
    fetchedSymbol !== undefined &&
    fetchedSymbol.length > 0 &&
    fetchedName !== undefined &&
    fetchedDecimals === 18


  const { data: logoData } = useQuery({
    queryKey: ['token-logo', fetchedSymbol],
    queryFn: async () => {
      const res = await fetch(`/api/token-logo?symbol=${encodeURIComponent(fetchedSymbol!)}`)
      if (!res.ok) return { image: null as string | null }
      return (await res.json()) as { image: string | null }
    },
    enabled: isReady && Boolean(fetchedSymbol),
    staleTime: Infinity,
  })
  const fetchedLogoUrl = logoData?.image ?? undefined

  const handleImport = () => {
    if (!isReady || !normalizedAddress || !fetchedSymbol || !fetchedName) return
    onImported({ symbol: fetchedSymbol, name: fetchedName, address: normalizedAddress, logoUrl: fetchedLogoUrl })
  }

  return (
    <div className="flex flex-col gap-2 md:gap-[0.5vw]">
      <input
        type="text"
        value={addressInput}
        onChange={(e) => setAddressInput(e.target.value)}
        placeholder="Paste token address (0x...)"
        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-[0.9vw] px-3.5 md:px-[1vw] py-2.5 md:py-[0.7vw] text-sm md:text-[0.95vw] text-white placeholder-gray-500 outline-none focus:border-blue-500/50 transition-colors"
      />

      {normalizedAddress && isAlreadyKnown && (
        <p className="text-xs md:text-[0.85vw] text-gray-400 px-1">Already in your list.</p>
      )}

      {normalizedAddress && !isAlreadyKnown && isFetching && (
        <p className="text-xs md:text-[0.85vw] text-gray-400 px-1">Checking token...</p>
      )}

      {normalizedAddress && !isAlreadyKnown && !isFetching && hasReadError && (
        <p className="text-xs md:text-[0.85vw] text-red-400 px-1">Not a valid ERC20 token on BSC testnet.</p>
      )}

      {normalizedAddress &&
        !isAlreadyKnown &&
        !isFetching &&
        !hasReadError &&
        fetchedDecimals !== undefined &&
        fetchedDecimals !== 18 && (
          <p className="text-xs md:text-[0.85vw] text-red-400 px-1">
            Only 18-decimal tokens are supported for now (this token has {fetchedDecimals}).
          </p>
        )}

      {normalizedAddress && !isAlreadyKnown && !isFetching && !hasReadError && symbolCollision && (
        <p className="text-xs md:text-[0.85vw] text-red-400 px-1">
          A token with symbol {fetchedSymbol} is already in your list.
        </p>
      )}

      {isReady && normalizedAddress && fetchedSymbol && fetchedName && (
        <div className="flex flex-col gap-2.5 md:gap-[0.7vw] p-3.5 md:p-[1vw] rounded-2xl md:rounded-[1vw] card border border-transparent">
          <div className="flex items-center gap-3.5 md:gap-[1vw]">
            <div className="w-10 h-10 md:w-[2.6vw] md:h-[2.6vw] rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
              <TokenIcon symbol={fetchedSymbol} imageUrl={fetchedLogoUrl} className="w-10 h-10 md:w-[2.6vw] md:h-[2.6vw]" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-base md:text-[1.15vw] text-white leading-tight">{fetchedSymbol}</span>
              <span className="text-gray-400 text-xs md:text-[0.9vw] leading-tight mt-0.5">
                {fetchedName} · {shortenAddress(normalizedAddress)}
              </span>
            </div>
          </div>
          <p className="text-[11px] md:text-[0.8vw] text-yellow-500/90 leading-snug">
            Anyone can create a token with any name or symbol. Make sure this is the contract you expect before
            importing.
          </p>
          <button
            onClick={handleImport}
            className="btn-color text-white font-semibold text-sm md:text-[0.95vw] py-2 md:py-[0.6vw] rounded-xl md:rounded-[0.9vw] transition-all active:scale-95"
          >
            Import
          </button>
        </div>
      )}
    </div>
  )
}

interface ModalContentProps {
  assets: Asset[]
  knownAssets: Asset[]
  onSelect: (asset: Asset) => void
  onImportToken: (asset: Asset) => void
}

const ModalContent: React.FC<ModalContentProps> = ({ assets, knownAssets, onSelect, onImportToken }) => (
  <div className="flex flex-col gap-3 md:gap-[0.8vw] pt-2 md:pt-[0.5vw]">
    <ImportTokenInput knownAssets={knownAssets} onImported={onImportToken} />
    <div className="flex flex-col gap-1.5 md:gap-[0.4vw]">
      {assets.map((asset) => (
        <button
          key={asset.symbol}
          onClick={() => onSelect(asset)}
          className="flex items-center gap-3.5 md:gap-[1vw] p-3.5 md:p-[1vw] rounded-2xl md:rounded-[1vw] transition-all duration-150 border border-transparent card active:scale-[0.99]"
        >
          <div className="w-10 h-10 md:w-[2.6vw] md:h-[2.6vw] rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
            <TokenIcon symbol={asset.symbol} imageUrl={asset.logoUrl} className="w-10 h-10 md:w-[2.6vw] md:h-[2.6vw]" />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-semibold text-base md:text-[1.15vw] text-white leading-tight">{asset.symbol}</span>
            <span className="text-gray-400 text-xs md:text-[0.9vw] leading-tight mt-0.5">{asset.name}</span>
          </div>
        </button>
      ))}
    </div>
  </div>
)

export const AssetSelectModal: React.FC<AssetSelectModalProps> = ({ trigger, assets, excludeSymbol, onSelect }) => {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { importedTokens, addToken } = useImportedTokens()

  const allAssets = [...assets, ...importedTokens]
  const filteredAssets = allAssets.filter((a) => a.symbol !== excludeSymbol)

  const handleSelect = (asset: Asset) => {
    onSelect(asset)
    setOpen(false)
  }

  const handleImportToken = (asset: Asset) => {
    addToken(asset)
    handleSelect(asset)
  }

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
            assets={filteredAssets}
            knownAssets={allAssets}
            onSelect={handleSelect}
            onImportToken={handleImportToken}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger as React.ReactElement} />
      <DrawerContent className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white rounded-t-[28px] px-5 pb-8 pt-3 max-h-[85vh]">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20 mb-4" />
        <DrawerHeader className="p-0 pb-2 text-left">
          <DrawerTitle className="text-xl font-semibold text-white">Select a token</DrawerTitle>
        </DrawerHeader>
        <ModalContent
          assets={filteredAssets}
          knownAssets={allAssets}
          onSelect={handleSelect}
          onImportToken={handleImportToken}
        />
      </DrawerContent>
    </Drawer>
  )
}
