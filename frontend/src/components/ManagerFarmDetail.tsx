import { Button, Empty, SkeletonLine, Text } from '@cloudflare/kumo'
import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { fetchDashboard } from '../api'
import { boundsForPreset } from '../period'
import type { DashboardPayload } from '../types'
import { AlertsPanel } from './AlertsPanel'
import type { ManagerOutletContext } from './ManagerShell'
import { ShedMap } from './ShedMap'

function FarmSkeleton() {
  return (
    <section className="flex flex-col gap-6" aria-busy="true" aria-label="Loading farm">
      <div className="flex flex-col gap-2">
        <SkeletonLine className="h-6 w-48 rounded-md" />
        <SkeletonLine className="h-4 w-32 rounded-md" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-kumo-line bg-kumo-elevated p-3"
          >
            <SkeletonLine className="mb-2 h-4 w-16 rounded-md" />
            <SkeletonLine className="mb-1 h-4 w-full rounded-md" />
            <SkeletonLine className="h-3 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function ManagerFarmDetail() {
  const { farmId = '' } = useParams()
  const navigate = useNavigate()
  const { farms, farmsError, farmsLoading } =
    useOutletContext<ManagerOutletContext>()
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)
  const [dashError, setDashError] = useState<string | null>(null)
  const [dashLoading, setDashLoading] = useState(false)

  const farmAssigned =
    !farmsLoading && farms.some((farm) => farm.id === farmId)

  useEffect(() => {
    if (!farmId || farmsLoading) return
    if (!farms.some((farm) => farm.id === farmId)) {
      setDashboard(null)
      setDashError(null)
      setDashLoading(false)
      return
    }

    let cancelled = false
    setDashLoading(true)
    const month = boundsForPreset('this_month', 'today')
    void fetchDashboard(farmId, month.from, month.to)
      .then((data) => {
        if (cancelled) return
        setDashboard(data)
        setDashError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDashError(
          err instanceof Error ? err.message : 'Failed to load farm',
        )
        setDashboard(null)
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [farmId, farms, farmsLoading])

  if (farmsError) {
    return (
      <Empty size="sm" title="Farms unavailable" description={farmsError} />
    )
  }

  if (farmsLoading || (dashLoading && !dashboard)) {
    return <FarmSkeleton />
  }

  if (!farmAssigned) {
    return (
      <Empty
        size="sm"
        title="Not available"
        description="This farm is not assigned to your account or no longer exists."
      />
    )
  }

  if (dashError && !dashboard) {
    return <Empty size="sm" title="Farm error" description={dashError} />
  }

  if (!dashboard) {
    return <FarmSkeleton />
  }

  return (
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
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
            {dashboard.farm.location || 'Location not set'}
          </Text>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/farms/${farmId}/godown`)}
        >
          Godown
        </Button>
      </div>

      <AlertsPanel alerts={dashboard.alerts} farmId={dashboard.farm.id} />

      <div>
        <Text as="h2" variant="secondary" size="sm" DANGEROUS_className="mb-3">
          Shed top view
        </Text>
        {dashboard.sheds.length === 0 ? (
          <Empty
            size="sm"
            title="No sheds"
            description="No sheds are configured for this farm."
          />
        ) : (
          <ShedMap sheds={dashboard.sheds} farmId={dashboard.farm.id} />
        )}
      </div>
    </section>
  )
}
