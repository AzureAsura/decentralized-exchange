import { PairLiquidityView } from '@/components/liquidity/PairLiquidityView'

export default async function PairLiquidityPage({
  params,
}: {
  params: Promise<{ pair: string }>
}) {
  const { pair } = await params

  return <PairLiquidityView pairAddress={pair as `0x${string}`} />
}
