import { NextRequest, NextResponse } from 'next/server'

// Proxy server-side ke CoinGecko `/search` — dicocokin berdasarkan SIMBOL (bukan alamat
// kontrak, itu udah pasti gagal buat token testnet — lihat NOTE.md Phase 4). Key CoinGecko
// (COINGECKO_API di .env, tanpa prefix NEXT_PUBLIC_) sengaja nggak boleh nyampe ke client,
// makanya lewat route ini, bukan fetch langsung dari browser.
export async function GET(request: NextRequest) {
    const symbol = request.nextUrl.searchParams.get('symbol')
    if (!symbol) {
        return NextResponse.json({ image: null })
    }

    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`, {
            headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API ?? '' },
        })
        if (!res.ok) return NextResponse.json({ image: null })

        const data = (await res.json()) as {
            coins?: { symbol: string; market_cap_rank: number | null; thumb?: string; large?: string }[]
        }

        // Match ketat simbol doang (bukan verifikasi kontrak) — kosmetik, bukan klaim keaslian
        // (warning "anyone can create a token with any name" udah ditampilin pas import).
        // Rank market cap terkecil dipilih duluan buat ngindarin listing sampah bersimbol sama.
        const matches = (data.coins ?? []).filter((c) => c.symbol.toLowerCase() === symbol.toLowerCase())
        const best = matches.sort(
            (a, b) => (a.market_cap_rank ?? Infinity) - (b.market_cap_rank ?? Infinity)
        )[0]

        return NextResponse.json({ image: best?.large || best?.thumb || null })
    } catch {
        return NextResponse.json({ image: null })
    }
}
