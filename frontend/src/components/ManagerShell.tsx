import {
  BarnIcon,
  HouseIcon,
  WarehouseIcon,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { fetchFarms } from '../api'
import { useAuth } from '../auth'
import { renderFarmBreadcrumbs } from '../farmBreadcrumbs'
import type { Farm } from '../types'
import { AppShell, type AppShellNavEntry } from './AppShell'

export type ManagerOutletContext = {
  farmId: string
  farms: Farm[]
  farmsError: string | null
  farmsLoading: boolean
  refreshFarms: () => Promise<void>
}

function farmIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/farms\/([^/]+)/)
  return match?.[1] ?? null
}

export function ManagerShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
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
      setFarmId((current) => {
        const fromUrl = farmIdFromPath(location.pathname)
        if (fromUrl && list.some((farm) => farm.id === fromUrl)) {
          return fromUrl
        }
        if (list.some((farm) => farm.id === current)) return current
        return list[0]?.id ?? ''
      })
    } catch (err: unknown) {
      setFarmsError(err instanceof Error ? err.message : 'Failed to load farms')
    } finally {
      setFarmsLoading(false)
    }
  }, [location.pathname])

  useEffect(() => {
    void refreshFarms()
  }, [refreshFarms])

  useEffect(() => {
    const fromUrl = farmIdFromPath(location.pathname)
    if (fromUrl && farms.some((farm) => farm.id === fromUrl) && fromUrl !== farmId) {
      setFarmId(fromUrl)
    }
  }, [location.pathname, farms, farmId])

  const activeFarmId = farmId || farms[0]?.id || ''

  const navEntries: AppShellNavEntry[] = useMemo(
    () => [
      {
        kind: 'link',
        label: 'My farms',
        path: '/',
        icon: HouseIcon,
      },
      {
        kind: 'link',
        label: 'Farm',
        path: activeFarmId ? `/farms/${activeFarmId}` : '/farms',
        icon: BarnIcon,
        isActive: (pathname) => {
          if (!activeFarmId) return false
          const farmBase = `/farms/${activeFarmId}`
          return (
            pathname === farmBase ||
            pathname.startsWith(`${farmBase}/sheds/`)
          )
        },
      },
      {
        kind: 'link',
        label: 'Godown',
        path: activeFarmId ? `/farms/${activeFarmId}/godown` : '/godown',
        icon: WarehouseIcon,
        isActive: (pathname) =>
          Boolean(activeFarmId) &&
          pathname.startsWith(`/farms/${activeFarmId}/godown`),
      },
    ],
    [activeFarmId],
  )

  function handleNavigate(path: string) {
    if (path === '/farms' || path === '/godown') {
      if (activeFarmId) {
        navigate(
          path === '/godown'
            ? `/farms/${activeFarmId}/godown`
            : `/farms/${activeFarmId}`,
        )
        return
      }
      navigate('/')
      return
    }
    navigate(path)
  }

  const pageTitle = location.pathname.includes('/godown')
    ? 'Godown'
    : location.pathname.includes('/sheds/')
      ? 'Daily log'
      : location.pathname.startsWith('/farms/')
        ? farms.find((f) => f.id === (params.farmId ?? farmId))?.name ?? 'Farm'
        : 'My farms'

  const onFarmScoped =
    location.pathname.startsWith('/farms/') && Boolean(params.farmId)

  const breadcrumbs = renderFarmBreadcrumbs({
    role: 'farm_manager',
    pathname: location.pathname,
    farms,
    farmsLoading,
    navigate,
  })

  function handleFarmChange(nextId: string) {
    setFarmId(nextId)
    if (!onFarmScoped) return
    if (location.pathname.includes('/godown')) {
      navigate(`/farms/${nextId}/godown`)
      return
    }
    if (location.pathname.includes('/sheds/')) {
      navigate(`/farms/${nextId}`)
      return
    }
    navigate(`/farms/${nextId}`)
  }

  return (
    <AppShell
      title={pageTitle}
      breadcrumbs={breadcrumbs ?? undefined}
      navEntries={navEntries}
      activePath={location.pathname}
      onNavigate={handleNavigate}
      farmSelector={
        onFarmScoped
          ? {
              farms,
              farmId: activeFarmId,
              onFarmChange: handleFarmChange,
              loading: farmsLoading,
            }
          : undefined
      }
      userEmail={user?.email}
      onLogout={() => void logout()}
    >
      <Outlet
        context={
          {
            farmId: activeFarmId,
            farms,
            farmsError,
            farmsLoading,
            refreshFarms,
          } satisfies ManagerOutletContext
        }
      />
    </AppShell>
  )
}
