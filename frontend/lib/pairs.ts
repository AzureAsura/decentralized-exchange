export interface Pair {
  slug: string
  tokenA: string
  tokenB: string
  tvl: string
  volume24h: string
  apr: string
  myLiquidity?: {
    lpTokens: string
    poolShare: string
    pooledA: string
    pooledB: string
  }
}

export const PAIRS: Pair[] = [
  {
    slug: 'eth-usdt',
    tokenA: 'ETH',
    tokenB: 'USDT',
    tvl: '$4.82M',
    volume24h: '$612K',
    apr: '18.4%',
    myLiquidity: {
      lpTokens: '2.104',
      poolShare: '0.04%',
      pooledA: '0.842',
      pooledB: '1,520.30',
    },
  },
  {
    slug: 'eth-usdc',
    tokenA: 'ETH',
    tokenB: 'USDC',
    tvl: '$3.11M',
    volume24h: '$398K',
    apr: '14.9%',
  },
  {
    slug: 'wbtc-eth',
    tokenA: 'WBTC',
    tokenB: 'ETH',
    tvl: '$1.94M',
    volume24h: '$205K',
    apr: '11.2%',
  },
  {
    slug: 'uni-eth',
    tokenA: 'UNI',
    tokenB: 'ETH',
    tvl: '$540K',
    volume24h: '$62K',
    apr: '9.7%',
  },
]

export function getPairBySlug(slug: string) {
  return PAIRS.find((p) => p.slug === slug)
}
