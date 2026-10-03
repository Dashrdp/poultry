import { Empty, Loader, Table, Text } from '@cloudflare/kumo'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  formatDecimal,
  formatGap,
  formatInt,
  formatPct,
  gapTextClass,
} from '../analyticsFormat'
import { fetchAnalyticsCompare } from '../api'
import { formatPeriodLabel } from '../period'
import type { AnalyticsCompareRow, CompareLevel } from '../types'
import { useAnalytics } from '../useAnalytics'
import { useOwnerPeriod } from '../useOwnerPeriod'
import { AgeCurveChart } from './AgeCurveChart'
import { AnalyticsPeriodBar } from './AnalyticsPeriodBar'
import { GapFeedScatter } from './GapFeedScatter'
import { PeriodToggle } from './PeriodToggle'

const LEVEL_OPTIONS: { value: CompareLevel; label: string }[] = [
  { value: 'shed', label: 'Sheds' },
  { value: 'farm', label: 'Farms' },
]

function byGapDesc(a: AnalyticsCompareRow, b: AnalyticsCompareRow): number {
  if (a.gap === null) return b.gap === null ? 0 : 1
  if (b.gap === null) return -1
  return b.gap - a.gap
}

function feedCell(row: AnalyticsCompareRow): string {
  if (row.feed_g === null) return '—'
  const std = row.std_feed_g === null ? '' : ` / ${row.std_feed_g.toFixed(0)}`
  return `${row.feed_g.toFixed(0)}${std} g`
}

export function AnalyticsComparePage() {
  const [level, setLevel] = useState<CompareLevel>('shed')
  const { period } = useOwnerPeriod('yesterday')
  const { data, error, loading } = useAnalytics(
    () => fetchAnalyticsCompare(level, period.from, period.to),
    `${level}:${period.from}:${period.to}`,
  )

  const rows = useMemo(() => (data ? [...data.rows].sort(byGapDesc) : []), [data])
  const isShed = data?.level === 'shed'

  if (error) {
    return <Empty size="sm" title="Could not load compare" description={error} />
  }
  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-6" aria-busy={loading}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text as="h1" variant="heading" size="lg">
            Compare {isShed ? 'sheds' : 'farms'}
          </Text>
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
            {formatPeriodLabel(period)} · ranked by gap to breed standard
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodToggle value={level} options={LEVEL_OPTIONS} onChange={setLevel} ariaLabel="Compare level" />
          <AnalyticsPeriodBar endCapMode="yesterday" />
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty size="sm" title="Nothing to compare" description="Place flocks in sheds to compare performance." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-kumo-line">
          <Table className="min-w-[64rem] text-sm">
            <Table.Header>
              <Table.Row>
                <Table.Head>#</Table.Head>
                <Table.Head>{isShed ? 'Shed' : 'Farm'}</Table.Head>
                {isShed ? <Table.Head>Age</Table.Head> : null}
                <Table.Head className="text-right">Birds</Table.Head>
                <Table.Head className="text-right">HDEP</Table.Head>
                <Table.Head className="text-right">Standard</Table.Head>
                <Table.Head className="text-right">Gap</Table.Head>
                <Table.Head className="text-right">Mortality</Table.Head>
                <Table.Head className="text-right">Cum. mortality</Table.Head>
                <Table.Head className="text-right">Feed / bird</Table.Head>
                <Table.Head className="text-right">Feed / 10 eggs</Table.Head>
                <Table.Head className="text-right">Livability</Table.Head>
                <Table.Head className="text-right">HHE</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row, index) => (
                <Table.Row key={row.id}>
                  <Table.Cell className="text-kumo-secondary tabular-nums">{index + 1}</Table.Cell>
                  <Table.Cell>
                    {isShed ? (
                      <Link className="font-medium text-kumo-default underline-offset-2 hover:underline" to={`/analytics/sheds/${row.id}`}>
                        {row.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-kumo-default">{row.name}</span>
                    )}
                    {isShed ? (
                      <span className="block text-xs text-kumo-secondary">{row.farm_name}</span>
                    ) : null}
                  </Table.Cell>
                  {isShed ? (
                    <Table.Cell className="tabular-nums text-kumo-secondary">
                      {row.age_week === null ? '—' : `Wk ${row.age_week}`}
                    </Table.Cell>
                  ) : null}
                  <Table.Cell className="text-right tabular-nums">{formatInt(row.birds)}</Table.Cell>
                  <Table.Cell className="text-right tabular-nums font-medium">{formatPct(row.hdep)}</Table.Cell>
                  <Table.Cell className="text-right tabular-nums text-kumo-secondary">{formatPct(row.std_hdep)}</Table.Cell>
                  <Table.Cell className={`text-right tabular-nums font-medium ${gapTextClass(row.gap)}`}>
                    {formatGap(row.gap)}
                  </Table.Cell>
                  <Table.Cell className="text-right tabular-nums">{formatPct(row.mortality_pct, 2)}</Table.Cell>
                  <Table.Cell className="text-right tabular-nums">{formatPct(row.mort_cum_pct)}</Table.Cell>
                  <Table.Cell className="text-right tabular-nums">{feedCell(row)}</Table.Cell>
                  <Table.Cell className="text-right tabular-nums">
                    {row.feed_per_10_eggs === null ? '—' : `${formatDecimal(row.feed_per_10_eggs)} kg`}
                  </Table.Cell>
                  <Table.Cell className="text-right tabular-nums">{formatPct(row.livability_pct)}</Table.Cell>
                  <Table.Cell className="text-right tabular-nums">{formatDecimal(row.hhe, 1)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
      {data.feed_estimated ? (
        <Text as="p" variant="secondary" size="xs">
          Feed is split from farm godown issues by bird-days until sheds record their own feed. Gap within −3 pts is on standard; below −5 pts is flagged.
        </Text>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {isShed ? <AgeCurveChart curves={data.age_curves} breedCurves={data.breed_curves} /> : null}
        <GapFeedScatter rows={rows} level={data.level} />
      </div>
    </section>
  )
}
