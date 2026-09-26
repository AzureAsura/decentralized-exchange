import { notFound } from 'next/navigation'
import { getPairBySlug } from '@/lib/pairs'
import { PairLiquidityView } from '@/components/liquidity/PairLiquidityView'

export default async function PairLiquidityPage({
  params,
}: {
  params: Promise<{ pair: string }>
}) {
  const { pair: slug } = await params
  const pair = getPairBySlug(slug)

  if (!pair) {
    notFound()
  }

  return <PairLiquidityView pair={pair} />
}
