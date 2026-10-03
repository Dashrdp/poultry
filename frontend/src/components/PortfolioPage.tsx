import { Badge, Empty, LayerCard, Loader, Text } from '@cloudflare/kumo'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  formatDecimal,
  formatGap,
  formatKpi,
  formatPct,
  formatInt,
  gapBadgeVariant,
  gapStatusLabel,
  gapTextClass,
} from '../analyticsFormat'
import { fetchPortfolio } from '../api'
import { formatPeriodLabel } from '../period'
import type { PortfolioFarm, PortfolioKpi } from '../types'
import { useAnalytics } from '../useAnalytics'
import { useOwnerPeriod } from '../useOwnerPeriod'
import { AnalyticsPeriodBar } from './AnalyticsPeriodBar'
import { EggTrendChart } from './EggTrendChart'
import { HdepSparkline } from './HdepSparkline'

function KpiTile({ kpi }: { kpi: PortfolioKpi }) {
  return (
    <LayerCard className="rounded-lg px-4 py-3">
      <Text as="p" variant="secondary" size="xs">
        {kpi.label}
      </Text>
      <Text
        as="p"
        variant="heading"
        size="lg"
        DANGEROUS_className={`mt-1 tabular-nums ${kpi.key === 'gap' ? gapTextClass(kpi.value) : ''}`}
      >
        {formatKpi(kpi.value, kpi.unit)}
      </Text>
      <Text as="p" variant="secondary" size="xs" DANGEROUS_className="mt-1 tabular-nums">
        {kpi.baseline === null ? 'Current' : `Prior period ${formatKpi(kpi.baseline, kpi.unit)}`}
      </Text>
    </LayerCard>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <dt className="text-xs text-kumo-secondary">{label}</dt>
      <dd className={`text-sm font-medium tabular-nums ${className ?? 'text-kumo-default'}`}>{value}</dd>
    </div>
  )
}

function FarmCard({ farm }: { farm: PortfolioFarm }) {
  const { reported, total } = farm.completeness
  return (
    <LayerCard className="flex flex-col gap-3 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-kumo-default">{farm.name}</h3>
          <Text as="p" variant="secondary" size="xs">
            {formatInt(farm.birds)} birds · {reported}/{total} sheds reported
          </Text>
        </div>
        <Badge variant={gapBadgeVariant(farm.status)}>{gapStatusLabel(farm.status)}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Stat label="HDEP" value={formatPct(farm.hdep)} />
        <Stat label="Gap to standard" value={formatGap(farm.gap)} className={gapTextClass(farm.gap)} />
        <Stat label="Mortality" value={formatPct(farm.mortality_pct, 2)} />
        <Stat label="Feed per 10 eggs" value={farm.feed_per_10_eggs === null ? '—' : `${formatDecimal(farm.feed_per_10_eggs)} kg`} />
      </dl>
      <HdepSparkline points={farm.weekly} label={farm.name} />
    </LayerCard>
  )
}

export function PortfolioPage() {
  const { period } = useOwnerPeriod('yesterday')
  const { data, error, loading } = useAnalytics(
    () => fetchPortfolio(period.from, period.to),
    `${period.from}:${period.to}`,
  )

  const farmsForTrend = useMemo(
    () => (data ? data.farms.map((farm) => ({ id: farm.id, name: farm.name })) : []),
    [data],
  )

  if (error) {
    return <Empty size="sm" title="Could not load portfolio" description={error} />
  }
  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    )
  }
  if (data.farms.length === 0) {
    return (
      <Empty
        size="sm"
        title="No farms yet"
        description="Create a farm and place a flock to see portfolio analytics."
        contents={
          <Link className="font-medium text-kumo-default underline" to="/farms">
            Go to farms
          </Link>
        }
      />
    )
  }

  const { reported, total } = data.completeness

  return (
    <section className="flex flex-col gap-6" aria-busy={loading}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text as="h1" variant="heading" size="lg">
            All farms
          </Text>
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
            {formatPeriodLabel(period)} vs prior period · {reported} of {total} flocks reported
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AnalyticsPeriodBar endCapMode="yesterday" />
          <Link className="text-sm font-medium text-kumo-default underline" to="/analytics/compare">
            Compare sheds
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {data.kpis.map((kpi) => (
          <KpiTile key={kpi.key} kpi={kpi} />
        ))}
      </div>

      <div>
        <Text as="h2" variant="secondary" size="xs" DANGEROUS_className="mb-3 uppercase tracking-wide">
          Farms · selected period vs breed standard
        </Text>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.farms.map((farm) => (
            <FarmCard key={farm.id} farm={farm} />
          ))}
        </div>
      </div>

      <EggTrendChart points={data.egg_trend} farms={farmsForTrend} loading={loading} />
    </section>
  )
}
