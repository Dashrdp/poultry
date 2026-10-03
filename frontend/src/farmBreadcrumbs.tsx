import { Breadcrumbs } from '@cloudflare/kumo'
import type { MouseEvent, ReactNode } from 'react'
import type { Farm } from './types'

export type FarmBreadcrumbRole = 'owner' | 'farm_manager'

type NestedLeaf = 'farm' | 'godown' | 'shed'

type NestedFarmPath = {
  farmId: string
  leaf: NestedLeaf
}

type FarmBreadcrumbsArgs = {
  role: FarmBreadcrumbRole
  pathname: string
  farms: Farm[]
  farmsLoading: boolean
  navigate: (path: string) => void
}

function parseNestedFarmPath(pathname: string): NestedFarmPath | null {
  const match = pathname.match(/^\/farms\/([^/]+)(?:\/(godown|sheds\/[^/]+))?\/?$/)
  if (!match) return null

  const farmId = match[1]
  const rest = match[2]
  if (!rest) return { farmId, leaf: 'farm' }
  if (rest === 'godown') return { farmId, leaf: 'godown' }
  if (rest.startsWith('sheds/')) return { farmId, leaf: 'shed' }
  return null
}

function spaNavigate(navigate: (path: string) => void) {
  return (event: MouseEvent<HTMLElement>) => {
    const anchor = (event.target as HTMLElement | null)?.closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('http') || href.startsWith('mailto:')) return
    event.preventDefault()
    navigate(href)
  }
}

export function renderFarmBreadcrumbs({
  role,
  pathname,
  farms,
  farmsLoading,
  navigate,
}: FarmBreadcrumbsArgs): ReactNode {
  const nested = parseNestedFarmPath(pathname)
  if (!nested) return null

  const root =
    role === 'owner'
      ? { label: 'Farms', path: '/farms' }
      : { label: 'My farms', path: '/' }

  const farm = farms.find((item) => item.id === nested.farmId)
  const farmLabel = farm?.name ?? 'Farm'
  const farmPath = `/farms/${nested.farmId}`
  const farmLoading = !farm?.name && farmsLoading

  if (nested.leaf === 'farm') {
    return (
      <div onClick={spaNavigate(navigate)}>
        <Breadcrumbs>
          <Breadcrumbs.Link href={root.path}>{root.label}</Breadcrumbs.Link>
          <Breadcrumbs.Separator />
          {farmLoading ? (
            <Breadcrumbs.Current loading />
          ) : (
            <Breadcrumbs.Current>{farmLabel}</Breadcrumbs.Current>
          )}
        </Breadcrumbs>
      </div>
    )
  }

  const leafLabel = nested.leaf === 'godown' ? 'Godown' : 'Daily log'

  return (
    <div onClick={spaNavigate(navigate)}>
      <Breadcrumbs>
        <Breadcrumbs.Link href={root.path}>{root.label}</Breadcrumbs.Link>
        <Breadcrumbs.Separator />
        {farmLoading ? (
          <Breadcrumbs.Current loading />
        ) : (
          <Breadcrumbs.Link href={farmPath}>{farmLabel}</Breadcrumbs.Link>
        )}
        {!farmLoading ? (
          <>
            <Breadcrumbs.Separator />
            <Breadcrumbs.Current>{leafLabel}</Breadcrumbs.Current>
          </>
        ) : null}
      </Breadcrumbs>
    </div>
  )
}
