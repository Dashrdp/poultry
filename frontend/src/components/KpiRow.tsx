import { LayerCard, Text } from '@cloudflare/kumo'
import type { DashboardKpis } from '../types'

type KpiRowProps = {
  kpis: DashboardKpis
}

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}

function formatFeed(qty: number, unit: string): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(qty)
  return `${formatted} ${unit}`
}

function formatHenDay(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)}%`
}

export function KpiRow({ kpis }: KpiRowProps) {
  const items: {
    label: string
    value: string
    valueVariant?: 'heading' | 'error'
  }[] = [
    { label: 'Birds on farm', value: formatInt(kpis.birds) },
    { label: 'Eggs (period)', value: formatInt(kpis.eggs_period) },
    {
      label: 'Deaths (period)',
      value: formatInt(kpis.deaths_period),
      valueVariant: kpis.deaths_period > 0 ? 'error' : 'heading',
    },
    { label: 'Hen-day', value: formatHenDay(kpis.hen_day_pct) },
    {
      label: 'Godown feed',
      value: formatFeed(kpis.feed_qty, kpis.feed_unit),
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <LayerCard key={item.label} className="rounded-lg p-4">
          <Text as="p" variant="secondary" size="xs">
            {item.label}
          </Text>
          <Text
            as="p"
            variant={item.valueVariant ?? 'heading'}
            size="lg"
            DANGEROUS_className="mt-1 font-semibold"
          >
            {item.value}
          </Text>
        </LayerCard>
      ))}
    </div>
  )
}
