import { Empty, Loader, Text } from '@cloudflare/kumo'
import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { fetchDashboard } from '../api'
import type { DashboardPayload, DashboardRange } from '../types'
import type { OwnerOutletContext } from './OwnerShell'
import { AlertsPanel } from './AlertsPanel'
import { KpiRow } from './KpiRow'
import { MoneyPanel } from './MoneyPanel'
import { RangeToggle } from './RangeToggle'
import { ShedMap } from './ShedMap'

export function OwnerDashboard() {
  const { farmId, farmsError, farmsLoading } =
    useOutletContext<OwnerOutletContext>()
  const [range, setRange] = useState<DashboardRange>('current_month')
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
    void fetchDashboard(farmId, range)
      .then((data) => {
        if (cancelled) return
        setDashboard(data)
        setDashError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDashError(
          err instanceof Error ? err.message : 'Failed to load dashboard',
        )
        setDashboard(null)
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [farmId, range])

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
          description="Create your first farm to start monitoring operations."
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
                {dashboard.farm.location}
              </Text>
            </div>
            <RangeToggle value={range} onChange={setRange} />
          </div>

          <AlertsPanel alerts={dashboard.alerts} />

          <div>
            <Text
              as="h2"
              variant="secondary"
              size="xs"
              DANGEROUS_className="mb-3 uppercase tracking-wide"
            >
              Shed top view
            </Text>
            <ShedMap sheds={dashboard.sheds} />
          </div>

          <div>
            <Text
              as="h2"
              variant="secondary"
              size="xs"
              DANGEROUS_className="mb-3 uppercase tracking-wide"
            >
              Period snapshot
            </Text>
            <KpiRow kpis={dashboard.kpis} />
          </div>

          <MoneyPanel money={dashboard.money} farmId={dashboard.farm.id} />
        </section>
      ) : dashError ? (
        <Empty size="sm" title="Dashboard error" description={dashError} />
      ) : (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      )}
    </>
  )
}
