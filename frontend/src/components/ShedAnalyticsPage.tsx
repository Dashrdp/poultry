import { Empty, LayerCard, Loader, Text } from '@cloudflare/kumo'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  formatDayLabel,
  formatDecimal,
  formatGap,
  formatInt,
  formatPct,
  gapTextClass,
} from '../analyticsFormat'
import { fetchShedAnalytics } from '../api'
import { flockStageLabel } from '../flock'
import { useAnalytics } from '../useAnalytics'
import { useOwnerPeriod } from '../useOwnerPeriod'
import { AnalyticsPeriodBar } from './AnalyticsPeriodBar'
import { MortalityChart } from './MortalityChart'
import { StandardLineChart } from './StandardLineChart'

function SummaryTile({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <LayerCard className="rounded-lg px-4 py-3">
      <Text as="p" variant="secondary" size="xs">
        {label}
      </Text>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${className ?? 'text-kumo-default'}`}>{value}</p>
      {hint ? (
        <Text as="p" variant="secondary" size="xs" DANGEROUS_className="mt-1 tabular-nums">
          {hint}
        </Text>
      ) : null}
    </LayerCard>
  )
}

export function ShedAnalyticsPage() {
  const { shedId = '' } = useParams()
  const { period } = useOwnerPeriod('yesterday')
  const { data, error, loading } = useAnalytics(
    () => fetchShedAnalytics(shedId, period.from, period.to),
    `${shedId}:${period.from}:${period.to}`,
  )

  const hdepPoints = useMemo(
    () => (data?.daily ?? []).map((d) => ({ date: d.date, actual: d.hdep, standard: d.std_hdep })),
    [data],
  )
  const feedPoints = useMemo(
    () => (data?.daily ?? []).map((d) => ({ date: d.date, actual: d.feed_g, standard: d.std_feed_g })),
    [data],
  )

  if (error) {
    return <Empty size="sm" title="Could not load shed" description={error} />
  }
  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    )
  }

  const { shed, flock, lifetime } = data

  return (
    <section className="flex flex-col gap-6" aria-busy={loading}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text as="p" variant="secondary" size="xs">
            <Link className="underline-offset-2 hover:underline" to="/analytics/compare">
              Compare
            </Link>
            {' / '}
            {shed.farm_name}
          </Text>
          <Text as="h1" variant="heading" size="lg" DANGEROUS_className="mt-1">
            {shed.name}
          </Text>
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
            {flock
              ? `${flock.breed_name} · Week ${flock.age_week} · ${flockStageLabel(flock.stage)} · placed ${formatDayLabel(flock.placed_date)}`
              : 'No active flock'}
          </Text>
        </div>
        {flock ? <AnalyticsPeriodBar endCapMode="yesterday" /> : null}
      </div>

      {!flock || !lifetime ? (
        <Empty
          size="sm"
          title="No active flock"
          description="Place a flock in this shed to see its performance."
          contents={
            <Link className="font-medium text-kumo-default underline" to={`/farms/${shed.farm_id}/sheds/${shed.id}`}>
              Open shed
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <SummaryTile
              label="Live birds"
              value={formatInt(flock.live_birds)}
              hint={`of ${formatInt(flock.birds_placed)} housed`}
            />
            <SummaryTile
              label="Livability"
              value={formatPct(lifetime.livability_pct)}
              hint={`Cum. mortality ${formatPct(lifetime.mort_cum_pct)}`}
            />
            <SummaryTile
              label="HDEP (28d)"
              value={formatPct(lifetime.hdep_28d)}
              hint={`Standard ${formatPct(lifetime.std_hdep_28d)}`}
            />
            <SummaryTile
              label="Gap to standard (28d)"
              value={formatGap(lifetime.gap_28d)}
              className={gapTextClass(lifetime.gap_28d)}
            />
            <SummaryTile
              label="Hen-housed eggs"
              value={formatDecimal(lifetime.hhe, 1)}
              hint={lifetime.std_hhe === null ? undefined : `Standard ${formatDecimal(lifetime.std_hhe, 1)}`}
            />
            <SummaryTile
              label={`Projected HHE at week ${lifetime.depletion_week}`}
              value={formatDecimal(lifetime.projected_hhe, 0)}
              hint={
                lifetime.feed_per_10_eggs_28d === null
                  ? undefined
                  : `${formatDecimal(lifetime.feed_per_10_eggs_28d)} kg feed / 10 eggs`
              }
            />
          </div>

          {data.daily.length === 0 ? (
            <Empty size="sm" title="No logs in this window" description="Daily logs will appear here once entered." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <StandardLineChart
                title="Hen-day production vs standard"
                actualLabel="HDEP"
                points={hdepPoints}
                format={(v) => `${v.toFixed(1)}%`}
                loading={loading}
              />
              <MortalityChart daily={data.daily} />
              <StandardLineChart
                title="Feed per bird vs standard"
                actualLabel="Feed g/bird"
                points={feedPoints}
                format={(v) => `${v.toFixed(0)} g`}
                loading={loading}
              />
              <LayerCard className="rounded-lg p-4">
                <Text as="h2" variant="secondary" size="xs" DANGEROUS_className="mb-3 uppercase tracking-wide">
                  How these are calculated
                </Text>
                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm text-kumo-secondary">
                  <li>HDEP = eggs ÷ bird-days, using each day's opening birds.</li>
                  <li>Standard = {flock.breed_name} weekly target for the flock's age that day.</li>
                  <li>Feed per bird is estimated from farm godown issues, split by bird-days across sheds.</li>
                  <li>
                    Projected HHE adds the remaining standard curve to week {lifetime.depletion_week}, scaled by the
                    last 28 days' performance and current livability.
                  </li>
                </ul>
              </LayerCard>
            </div>
          )}
        </>
      )}
    </section>
  )
}
