'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { formatUnits } from 'viem'
import { Copy, Check, Menu, X } from 'lucide-react'
import { ConnectWalletModal } from '@/components/shared/ConnectWalletModal'
import { SettingsModal } from '@/components/shared/SettingsModal'
import { useCorrectNetwork } from '@/hooks/use-correct-network'

const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

const Navbar = () => {
    const pathname = usePathname()
    const { address, isConnected, chain } = useAccount()
    const { disconnect } = useDisconnect()
    const { data: balance } = useBalance({ address })
    const { isWrongNetwork, isSwitching, switchToCorrectNetwork } = useCorrectNetwork()
    const [isOtherAppsOpen, setIsOtherAppsOpen] = useState(false)
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const accountMenuRef = useRef<HTMLDivElement>(null)

    // Menutup dropdown saat klik di luar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOtherAppsOpen(false)
            }
            if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
                setIsAccountMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Tutup mobile menu saat rute berpindah
    useEffect(() => {
        setIsMobileMenuOpen(false)
    }, [pathname])

    const handleCopyAddress = () => {
        if (!address) return
        navigator.clipboard.writeText(address)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <>
            <nav className="fixed top-0 left-0 w-full z-50 transition-all card">
                <div className="px-3 md:px-0 md:w-[95vw] mx-auto rounded-xl py-3 md:py-4 flex items-center shadow-2xl">
                    <div className="flex items-center justify-between w-full gap-2">
                        {/* Logo Section */}
                        <Link href={'/'} className="flex items-center gap-2 cursor-pointer group shrink-0">
                            <Image src={'https://nirmala-finance-cpt.vercel.app/logo.svg'} alt='logo' height={32} width={32} className="md:w-[35px] md:h-[35px]" priority />
                            <div className="flex flex-col justify-between leading-none">
                                <span className="text-base md:text-[18px] font-black tracking-tighter text-white uppercase">
                                    Nirmala
                                </span>
                                <span className="text-[10px] md:text-[12px] font-bold tracking-[0.2em] text-blue-500 uppercase">
                                    Exchange
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center card p-1.5 rounded-2xl">
                            <Link
                                href="/trade"
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${pathname === '/trade' || pathname === '/'
                                    ? 'text-white btn-color shadow-lg shadow-blue-500/20'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <span>Trade</span>
                            </Link>

                            <Link
                                href="/liquidity"
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${pathname?.startsWith('/liquidity')
                                    ? 'text-white btn-color shadow-lg shadow-blue-500/20'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3" />
                                </svg>
                                <span>Pool</span>
                            </Link>

                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsOtherAppsOpen(!isOtherAppsOpen)}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs md:text-sm font-semibold text-gray-400 hover:text-white transition-colors select-none"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                    <span>Other Apps</span>
                                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isOtherAppsOpen ? 'rotate-180 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isOtherAppsOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#0b0e17] p-2 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] border border-blue-500/30 ring-1 ring-white/10 z-50 flex flex-col gap-1">
                                        <Link
                                            href="https://nirmala-lottery.vercel.app"
                                            target="_blank"
                                            onClick={() => setIsOtherAppsOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                            </svg>
                                            <span>Lottery</span>
                                        </Link>

                                        <Link
                                            href="https://nirmala-finance-cpt.vercel.app"
                                            target="_blank"
                                            onClick={() => setIsOtherAppsOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span>Crypto Price Tracker</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Tombol GitHub (Desktop) */}
                            <Link
                                href="https://github.com/AzureAsura/blockchain-multiwinner-lottery"
                                target="_blank"
                                className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-xl card text-white transition-all active:scale-95 shadow-sm shrink-0 hidden sm:flex"
                                aria-label="GitHub Repository"
                            >
                                <svg className="w-4 h-4 md:w-5 md:h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                            </Link>

                            {/* Tombol Connect Wallet / Account */}
                            {isConnected && isWrongNetwork ? (
                                <button
                                    type="button"
                                    onClick={switchToCorrectNetwork}
                                    disabled={isSwitching}
                                    className="h-9 md:h-10 px-3 md:px-4 flex items-center justify-center rounded-xl text-xs md:text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/40 transition-all active:scale-95 whitespace-nowrap shrink-0 disabled:opacity-60"
                                >
                                    {isSwitching ? 'Switching...' : 'Wrong Network'}
                                </button>
                            ) : isConnected && address ? (
                                <div className="relative shrink-0" ref={accountMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                                        className="h-9 md:h-10 px-3 md:px-4 flex items-center justify-center rounded-xl text-xs md:text-sm font-semibold text-white btn-color shadow-lg shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
                                    >
                                        {truncateAddress(address)}
                                    </button>

                                    {/* Account Dropdown */}
                                    {isAccountMenuOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] max-w-[280px] sm:w-72 bg-[#0b0e17] p-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] border border-blue-500/30 ring-1 ring-white/10 z-50 flex flex-col gap-3">
                                            <span className="text-xs text-gray-400">
                                                Connected to {chain?.name ?? 'unknown network'}
                                            </span>

                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs sm:text-sm text-white font-mono break-all">
                                                    {address}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyAddress}
                                                    aria-label="Copy address"
                                                    className="shrink-0 text-gray-400 hover:text-white transition-colors"
                                                >
                                                    {copied ? (
                                                        <Check className="w-4 h-4 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>

                                            <span className="text-xs sm:text-sm text-gray-300">
                                                {balance
                                                    ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}`
                                                    : 'Loading balance...'}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    disconnect()
                                                    setIsAccountMenuOpen(false)
                                                }}
                                                className="btn-color w-full text-white font-semibold text-xs py-2 rounded-xl transition-all active:scale-95"
                                            >
                                                Disconnect
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <ConnectWalletModal
                                    trigger={
                                        <button
                                            type="button"
                                            className="h-9 md:h-10 px-3 md:px-4 flex items-center justify-center rounded-xl text-xs md:text-sm font-semibold text-white btn-color shadow-lg shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap shrink-0"
                                        >
                                            Connect Wallet
                                        </button>
                                    }
                                />
                            )}

                            {/* Tombol Settings */}
                            <SettingsModal
                                trigger={
                                    <button
                                        type="button"
                                        aria-label="Settings"
                                        className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-xl card text-white transition-all active:scale-95 shadow-sm shrink-0"
                                    >
                                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                }
                            />

                            {/* Tombol Hamburger (Mobile Only) */}
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-xl card text-white transition-all active:scale-95 shrink-0"
                                aria-label="Toggle Navigation Menu"
                            >
                                {isMobileMenuOpen ? <X className="w-4 h-4 md:w-5 md:h-5" /> : <Menu className="w-4 h-4 md:w-5 md:h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Dropdown Navigation Menu */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden border-t border-white/10 px-4 py-3 bg-[#0b0e17]/95 backdrop-blur-xl flex flex-col gap-2">
                        <Link
                            href="/trade"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${pathname === '/trade' || pathname === '/'
                                ? 'text-white btn-color'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <span>Trade</span>
                        </Link>

                        <Link
                            href="/liquidity"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${pathname?.startsWith('/liquidity')
                                ? 'text-white btn-color'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3" />
                            </svg>
                            <span>Pool</span>
                        </Link>

                        <div className="pt-2 border-t border-white/5 flex flex-col gap-1">
                            <span className="text-xs text-gray-500 font-semibold px-2 mb-1">Other Apps</span>
                            <Link
                                href="https://nirmala-lottery.vercel.app"
                                target="_blank"
                                className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
                            >
                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                                <span>Lottery</span>
                            </Link>

                            <Link
                                href="https://nirmala-finance-cpt.vercel.app"
                                target="_blank"
                                className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
                            >
                                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>Crypto Price Tracker</span>
                            </Link>
                        </div>
                    </div>
                )}
            </nav>
        </>
    )
}

export default Navbar