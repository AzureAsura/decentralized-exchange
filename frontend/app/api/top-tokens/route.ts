import { NextResponse } from 'next/server'

// Satu request ke CoinGecko `/coins/markets` — balikin logo TOP N coin by market cap SEKALIGUS,
// jauh lebih ringan dibanding fetch per-simbol (landing page tadinya 8 request terpisah ke
// /api/token-logo, masing-masing manggil CoinGecko /search sendiri-sendiri). Beda dari
// /api/token-logo yang tetap dipakai — itu buat lookup token SEMBARANG (fitur import token
// custom di AssetSelectModal.tsx), yang nggak bisa dijawab endpoint /coins/markets karena itu
// cuma nunjukin coin yang emang ke-rank market cap-nya, bukan cari by-simbol bebas.
export async function GET() {
    try {
        const res = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false',
            { headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API ?? '' } }
        )
        if (!res.ok) return NextResponse.json({ tokens: [] })

        const data = (await res.json()) as { symbol?: string; image?: string }[]
        const tokens = data
            .filter((c) => c.symbol)
            .map((c) => ({ symbol: c.symbol!.toUpperCase(), image: c.image ?? null }))

        return NextResponse.json({ tokens })
    } catch {
        return NextResponse.json({ tokens: [] })
    }
}
