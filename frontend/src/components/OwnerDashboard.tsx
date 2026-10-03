import { Button, Empty, Loader, SkeletonLine, Text } from '@cloudflare/kumo'
import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { downloadDashboardPdf, fetchDashboard } from '../api'
import { formatPeriodLabel } from '../period'
import type { DashboardPayload } from '../types'
import { useOwnerPeriod } from '../useOwnerPeriod'
import type { OwnerOutletContext } from './OwnerShell'
import { AlertsPanel } from './AlertsPanel'
import { AnalyticsPeriodBar } from './AnalyticsPeriodBar'
import { KpiRow } from './KpiRow'
import { MoneyPanel } from './MoneyPanel'
import { ShedMap } from './ShedMap'

function DashboardSkeleton() {
  return (
    <section className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <SkeletonLine className="h-6 w-48 rounded-md" />
          <SkeletonLine className="h-4 w-32 rounded-md" />
        </div>
        <div className="flex gap-2">
          <SkeletonLine className="h-8 w-24 rounded-md" />
          <SkeletonLine className="h-8 w-24 rounded-md" />
          <SkeletonLine className="h-8 w-28 rounded-md" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-kumo-line bg-kumo-elevated p-3"
          >
            <SkeletonLine className="mb-2 h-4 w-16 rounded-md" />
            <SkeletonLine className="mb-1 h-4 w-full rounded-md" />
            <SkeletonLine className="h-3 w-3/4 rounded-md" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-kumo-line bg-kumo-elevated p-4"
          >
            <SkeletonLine className="mb-2 h-3 w-20 rounded-md" />
            <SkeletonLine className="h-6 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function OwnerDashboard() {
  const { farmId, farmsError, farmsLoading } =
    useOutletContext<OwnerOutletContext>()
  const { period } = useOwnerPeriod('today')
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)
  const [dashError, setDashError] = useState<string | null>(null)
  const [dashLoading, setDashLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

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
  }, [farmId, period.from, period.to])

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
        <section
          className={`flex flex-col gap-6 transition-opacity duration-200 ${
            dashLoading ? 'opacity-60' : 'opacity-100'
          }`}
          aria-busy={dashLoading}
        >
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
              <Text
                as="p"
                variant="secondary"
                size="xs"
                DANGEROUS_className="mt-1"
              >
                {formatPeriodLabel(period)}
              </Text>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AnalyticsPeriodBar endCapMode="today" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!farmId || exporting || dashLoading}
                onClick={() => {
                  if (!farmId) return
                  setExporting(true)
                  setExportError(null)
                  void downloadDashboardPdf(farmId, period.from, period.to)
                    .catch((err: unknown) => {
                      setExportError(
                        err instanceof Error
                          ? err.message
                          : 'Failed to export PDF',
                      )
                    })
                    .finally(() => setExporting(false))
                }}
              >
                {exporting ? 'Exporting…' : 'Export PDF'}
              </Button>
            </div>
          </div>
          {exportError ? (
            <Text
              as="p"
              variant="secondary"
              size="sm"
              DANGEROUS_className="text-kumo-danger"
            >
              {exportError}
            </Text>
          ) : null}

          <AlertsPanel alerts={dashboard.alerts} farmId={dashboard.farm.id} />

          <div>
            <Text as="h2" variant="secondary" size="sm" DANGEROUS_className="mb-3">
              Shed top view
            </Text>
            <ShedMap sheds={dashboard.sheds} farmId={dashboard.farm.id} />
          </div>

          <div>
            <Text as="h2" variant="secondary" size="sm" DANGEROUS_className="mb-3">
              Period snapshot
            </Text>
            <KpiRow kpis={dashboard.kpis} />
          </div>

          <MoneyPanel money={dashboard.money} farmId={dashboard.farm.id} />
        </section>
      ) : dashError ? (
        <Empty size="sm" title="Dashboard error" description={dashError} />
      ) : dashLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      )}
    </>
  )
}
