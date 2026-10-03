import { Empty, Loader, Text } from '@cloudflare/kumo'
import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { fetchDashboard } from '../api'
import {
  formatRankMetric,
  rankMetricLabel,
  sortByRank,
} from '../rank'
import type { DashboardPayload, RankMetric } from '../types'
import type { OwnerOutletContext } from './OwnerShell'
import { CompareTables } from './CompareTables'
import { KpiSparkCard } from './KpiSparkCard'
import { MetricTrendChart } from './MetricTrendChart'
import { PerformanceBarChart } from './PerformanceBarChart'
import { RankToggle } from './RankToggle'
import { useOwnerPeriod } from '../useOwnerPeriod'
import { AnalyticsPeriodBar } from './AnalyticsPeriodBar'

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

export function OwnerAnalytics() {
  const { farmId, farmsError, farmsLoading } =
    useOutletContext<OwnerOutletContext>()
  const { period } = useOwnerPeriod('yesterday')
  const [rankMetric, setRankMetric] = useState<RankMetric>('hen_day')
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)
  const [dashError, setDashError] = useState<string | null>(null)
  const [dashLoading, setDashLoading] = useState(false)

  useEffect(() => {
    if (!farmId) {
      setDashboard(null)
      setDashError(null)
      setDashLoading(false)
      return
    }
    let cancelled = false
    setDashLoading(true)
    void fetchDashboard(farmId, period.from, period.to)
      .then((data) => {
        if (cancelled) return
        setDashboard(data)
        setDashError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDashError(
          err instanceof Error ? err.message : 'Failed to load analytics',
        )
        setDashboard(null)
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [farmId, period.from, period.to])

  const shedMetric: RankMetric =
    rankMetric === 'margin' ? 'hen_day' : rankMetric

  const rankedSheds = useMemo(
    () =>
      dashboard ? sortByRank(dashboard.compare_sheds, shedMetric) : [],
    [dashboard, shedMetric],
  )

  const rankedFarms = useMemo(
    () =>
      dashboard ? sortByRank(dashboard.compare_farms, rankMetric) : [],
    [dashboard, rankMetric],
  )

  const bestShed = rankedSheds[0]
  const bestFarm = rankedFarms[0]

  const shedBarItems = rankedSheds.map((row) => ({
    id: row.id,
    label: `${row.number}. ${row.name}`,
    value:
      shedMetric === 'hen_day'
        ? row.hen_day_pct
        : shedMetric === 'eggs'
          ? row.eggs_period
          : null,
  }))

  const farmBarItems = rankedFarms.map((row) => ({
    id: row.id,
    label: row.name,
    value:
      rankMetric === 'hen_day'
        ? row.hen_day_pct
        : rankMetric === 'eggs'
          ? row.eggs_period
          : row.margin,
  }))

  return (
    <>
      {farmsError ? (
        <Empty
          size="sm"
          title="Could not load farms"
          description={`${farmsError}. Is the API running on port 8010?`}
        />
      ) : null}

      {farmsLoading ? (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      ) : !farmsError && !farmId ? (
        <Empty
          size="sm"
          title="No farms yet"
          description="Create a farm before viewing analytics."
          contents={
            <Link className="font-medium text-kumo-default underline" to="/farms">
              Go to farms
            </Link>
          }
        />
      ) : dashboard ? (
        <section className="flex flex-col gap-6" aria-busy={dashLoading}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Text as="h1" variant="heading" size="lg">
                {dashboard.farm.name}
              </Text>
              <Text
                as="p"
                variant="secondary"
                size="sm"
                DANGEROUS_className="mt-1"
              >
                {dashboard.farm.location || 'Performance for the selected range'}
              </Text>
            </div>
            <div className="flex flex-col items-end gap-2">
              <AnalyticsPeriodBar endCapMode="yesterday" />
              <RankToggle value={rankMetric} onChange={setRankMetric} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiSparkCard
              label="Birds on farm"
              value={formatInt(dashboard.kpis.birds)}
              series={dashboard.series}
              sparkMetric="birds"
            />
            <KpiSparkCard
              label="Eggs (period)"
              value={formatInt(dashboard.kpis.eggs_period)}
              series={dashboard.series}
              sparkMetric="eggs"
            />
            <KpiSparkCard
              label="Deaths (period)"
              value={formatInt(dashboard.kpis.deaths_period)}
            />
            <KpiSparkCard
              label="Hen-day"
              value={formatHenDay(dashboard.kpis.hen_day_pct)}
            />
            <KpiSparkCard
              label="Godown feed"
              value={formatFeed(
                dashboard.kpis.feed_qty,
                dashboard.kpis.feed_unit,
              )}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MetricTrendChart
              series={dashboard.series}
              metric="eggs"
              title="Eggs over time"
              loading={dashLoading}
            />
            <MetricTrendChart
              series={dashboard.series}
              metric="birds"
              title="Birds over time"
              loading={dashLoading}
            />
            <div>
              <Text
                as="h2"
                variant="secondary"
                size="xs"
                DANGEROUS_className="mb-3 uppercase tracking-wide"
              >
                Shed performance
              </Text>
              {shedBarItems.length > 0 ? (
                <PerformanceBarChart
                  items={shedBarItems}
                  valueLabel={rankMetricLabel(shedMetric)}
                  ariaDescription={`Shed ranking by ${rankMetricLabel(shedMetric)}`}
                />
              ) : (
                <Empty size="sm" title="No sheds" description="Add sheds to compare." />
              )}
            </div>
            <div>
              <Text
                as="h2"
                variant="secondary"
                size="xs"
                DANGEROUS_className="mb-3 uppercase tracking-wide"
              >
                Farm performance
              </Text>
              {farmBarItems.length > 0 ? (
                <PerformanceBarChart
                  items={farmBarItems}
                  valueLabel={rankMetricLabel(rankMetric)}
                  highlightId={dashboard.farm.id}
                  ariaDescription={`Farm ranking by ${rankMetricLabel(rankMetric)}`}
                />
              ) : (
                <Empty size="sm" title="No farms" description="No farms to compare." />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-kumo-line bg-kumo-elevated px-4 py-3">
            <Text as="p" size="sm" variant="secondary">
              Best shed ({rankMetricLabel(shedMetric)}
              {rankMetric === 'margin' ? ', farms use margin' : ''}):{' '}
              <Text as="span" variant="body" size="sm">
                {bestShed
                  ? `${bestShed.number}. ${bestShed.name} (${formatRankMetric(bestShed, shedMetric)})`
                  : '—'}
              </Text>
              {' · '}
              Best farm ({rankMetricLabel(rankMetric)}):{' '}
              <Text as="span" variant="body" size="sm">
                {bestFarm
                  ? `${bestFarm.name} (${formatRankMetric(bestFarm, rankMetric)})`
                  : '—'}
              </Text>
            </Text>
          </div>

          <CompareTables
            sheds={rankedSheds}
            farms={rankedFarms}
            currentFarmId={dashboard.farm.id}
            showRank
          />
        </section>
      ) : dashError ? (
        <Empty size="sm" title="Analytics error" description={dashError} />
      ) : (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      )}
    </>
  )
}
