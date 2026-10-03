import {
  ChartLineIcon,
  GearIcon,
  HouseIcon,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { fetchFarms } from '../api'
import { useAuth } from '../auth'
import { renderFarmBreadcrumbs } from '../farmBreadcrumbs'
import type { Farm } from '../types'
import { AppShell, type AppShellNavEntry } from './AppShell'

const navEntries: AppShellNavEntry[] = [
  {
    kind: 'group',
    label: 'Monitor',
    icon: HouseIcon,
    children: [{ label: 'Dashboard', path: '/' }],
  },
  {
    kind: 'group',
    label: 'Analytics',
    icon: ChartLineIcon,
    children: [
      { label: 'Portfolio', path: '/analytics/portfolio' },
      { label: 'Compare', path: '/analytics/compare' },
      { label: 'Trends', path: '/analytics/trends' },
    ],
  },
  {
    kind: 'group',
    label: 'Setup',
    icon: GearIcon,
    children: [
      { label: 'Farms', path: '/farms' },
      { label: 'Managers', path: '/managers' },
    ],
  },
]

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/analytics/portfolio': 'Portfolio',
  '/analytics/compare': 'Compare',
  '/analytics/trends': 'Trends',
  '/farms': 'Farms',
  '/managers': 'Managers',
}

export type OwnerOutletContext = {
  farmId: string
  farmsError: string | null
  farmsLoading: boolean
  refreshFarms: () => Promise<void>
}

export function OwnerShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [farms, setFarms] = useState<Farm[]>([])
  const [farmId, setFarmId] = useState('')
  const [farmsError, setFarmsError] = useState<string | null>(null)
  const [farmsLoading, setFarmsLoading] = useState(true)

  const refreshFarms = useCallback(async () => {
    setFarmsLoading(true)
    try {
      const list = await fetchFarms()
      setFarms(list)
      setFarmsError(null)
      setFarmId((current) =>
        list.some((farm) => farm.id === current) ? current : (list[0]?.id ?? ''),
      )
    } catch (err: unknown) {
      setFarmsError(err instanceof Error ? err.message : 'Failed to load farms')
    } finally {
      setFarmsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshFarms()
  }, [refreshFarms])

  const pageTitle = location.pathname.includes('/godown')
    ? 'Godown'
    : location.pathname.startsWith('/analytics/sheds/')
      ? 'Shed performance'
    : location.pathname.includes('/sheds/')
      ? 'Daily log'
      : location.pathname.startsWith('/farms/')
        ? 'Farm details'
        : (pageTitles[location.pathname] ?? 'PoultryTrack')

  const showFarmSelector =
    location.pathname === '/' || location.pathname === '/analytics/trends'

  const breadcrumbs = renderFarmBreadcrumbs({
    role: 'owner',
    pathname: location.pathname,
    farms,
    farmsLoading,
    navigate,
  })

  return (
    <AppShell
      title={pageTitle}
      breadcrumbs={breadcrumbs ?? undefined}
      navEntries={navEntries}
      activePath={location.pathname}
      onNavigate={navigate}
      farmSelector={
        showFarmSelector
          ? {
              farms,
              farmId,
              onFarmChange: setFarmId,
              loading: farmsLoading,
            }
          : undefined
      }
      userEmail={user?.email}
      onLogout={() => void logout()}
    >
      <Outlet
        context={{
          farmId,
          farmsError,
          farmsLoading,
          refreshFarms,
        } satisfies OwnerOutletContext}
      />
    </AppShell>
  )
}
