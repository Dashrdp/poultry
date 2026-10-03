import { LayerCard, Text } from '@cloudflare/kumo'
import { Link } from 'react-router-dom'
import type { MoneySummary } from '../types'

type MoneyPanelProps = {
  money: MoneySummary | null
  farmId: string
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n)
}

export function MoneyPanel({ money, farmId }: MoneyPanelProps) {
  return (
    <div className="flex flex-col gap-3" role="region" aria-label="Rough margin">
      <Text as="h2" variant="secondary" size="sm">
        Rough margin
      </Text>

      {money === null ? (
        <Text as="p" variant="secondary" size="sm">
          Rates not set.{' '}
          <Link
            className="font-medium text-kumo-default underline"
            to={`/farms/${farmId}`}
          >
            Set egg price and feed cost
          </Link>
        </Text>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <LayerCard className="rounded-lg p-4">
            <Text as="p" variant="secondary" size="xs">
              Revenue
            </Text>
            <Text as="p" variant="heading" size="lg" DANGEROUS_className="mt-1">
              {formatMoney(money.revenue)}
            </Text>
            <Text as="p" variant="secondary" size="xs" DANGEROUS_className="mt-1">
              {formatMoney(money.eggs_period)} eggs × {formatMoney(money.egg_price)}
            </Text>
          </LayerCard>
          <LayerCard className="rounded-lg p-4">
            <Text as="p" variant="secondary" size="xs">
              Feed cost
            </Text>
            <Text as="p" variant="heading" size="lg" DANGEROUS_className="mt-1">
              {formatMoney(money.feed_cost)}
            </Text>
            <Text as="p" variant="secondary" size="xs" DANGEROUS_className="mt-1">
              {formatMoney(money.feed_out_kg)} kg ×{' '}
              {formatMoney(money.feed_cost_per_kg)}
            </Text>
          </LayerCard>
          <LayerCard className="rounded-lg p-4">
            <Text as="p" variant="secondary" size="xs">
              Margin
            </Text>
            <Text as="p" variant="heading" size="lg" DANGEROUS_className="mt-1">
              {formatMoney(money.margin)}
            </Text>
            <Text as="p" variant="secondary" size="xs" DANGEROUS_className="mt-1">
              Revenue − feed cost
            </Text>
          </LayerCard>
        </div>
      )}
    </div>
  )
}
