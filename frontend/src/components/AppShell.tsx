import { Sidebar, Text } from '@cloudflare/kumo'
import type { ComponentProps, ReactNode } from 'react'
import { BrandMark } from './BrandMark'
import { FarmSelector } from './FarmSelector'
import { UserMenu } from './UserMenu'
import type { Farm } from '../types'

export type AppShellNavLeaf = {
  kind: 'link'
  label: string
  path: string
  icon: ComponentProps<typeof Sidebar.MenuButton>['icon']
  /** When set, overrides default prefix matching for active state. */
  isActive?: (pathname: string) => boolean
}

export type AppShellNavGroup = {
  kind: 'group'
  label: string
  icon: ComponentProps<typeof Sidebar.MenuButton>['icon']
  children: { label: string; path: string }[]
}

export type AppShellNavEntry = AppShellNavLeaf | AppShellNavGroup

/** Flat link list still supported for simple shells. */
export type AppShellNavItem = {
  label: string
  path: string
  icon: ComponentProps<typeof Sidebar.MenuButton>['icon']
}

type AppShellProps = {
  title: string
  /** When set, replaces the flat page title in the sticky header. */
  breadcrumbs?: ReactNode
  navEntries?: AppShellNavEntry[]
  /** @deprecated Prefer navEntries; kept for flat Manager-style lists if needed */
  navItems?: AppShellNavItem[]
  activePath: string
  onNavigate: (path: string) => void
  farmSelector?: {
    farms: Farm[]
    farmId: string
    onFarmChange: (id: string) => void
    loading?: boolean
  }
  userEmail?: string
  onLogout?: () => void
  children: ReactNode
}

function pathActive(activePath: string, path: string): boolean {
  return (
    activePath === path ||
    (path !== '/' && activePath.startsWith(`${path}/`))
  )
}

function groupOpen(activePath: string, children: { path: string }[]): boolean {
  return children.some((child) => pathActive(activePath, child.path))
}

export function AppShell({
  title,
  breadcrumbs,
  navEntries,
  navItems,
  activePath,
  onNavigate,
  farmSelector,
  userEmail,
  onLogout,
  children,
}: AppShellProps) {
  const entries: AppShellNavEntry[] =
    navEntries ??
    (navItems ?? []).map(
      (item): AppShellNavLeaf => ({
        kind: 'link',
        label: item.label,
        path: item.path,
        icon: item.icon,
      }),
    )

  return (
    <Sidebar.Provider defaultOpen peekable className="flex min-h-svh w-full bg-kumo-canvas">
      <Sidebar className="h-svh">
        <Sidebar.Header>
          <BrandMark variant="compact" />
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.GroupLabel>Navigate</Sidebar.GroupLabel>
            <Sidebar.Menu>
              {entries.map((entry) => {
                if (entry.kind === 'link') {
                  const active = entry.isActive
                    ? entry.isActive(activePath)
                    : pathActive(activePath, entry.path)
                  return (
                    <Sidebar.MenuButton
                      key={`${entry.label}:${entry.path}`}
                      icon={entry.icon}
                      tooltip={entry.label}
                      active={active}
                      onClick={() => onNavigate(entry.path)}
                    >
                      {entry.label}
                    </Sidebar.MenuButton>
                  )
                }

                const open = groupOpen(activePath, entry.children)
                return (
                  <Sidebar.MenuItem key={entry.label}>
                    <Sidebar.Collapsible defaultOpen={open}>
                      <Sidebar.CollapsibleTrigger
                        render={
                          <Sidebar.MenuButton icon={entry.icon} tooltip={entry.label}>
                            {entry.label}
                            <Sidebar.MenuChevron />
                          </Sidebar.MenuButton>
                        }
                      />
                      <Sidebar.CollapsibleContent>
                        <Sidebar.MenuSub>
                          {entry.children.map((child) => (
                            <Sidebar.MenuSubButton
                              key={child.path}
                              active={pathActive(activePath, child.path)}
                              onClick={() => onNavigate(child.path)}
                            >
                              {child.label}
                            </Sidebar.MenuSubButton>
                          ))}
                        </Sidebar.MenuSub>
                      </Sidebar.CollapsibleContent>
                    </Sidebar.Collapsible>
                  </Sidebar.MenuItem>
                )
              })}
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Footer>
          <Sidebar.Trigger />
        </Sidebar.Footer>
      </Sidebar>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-kumo-line bg-kumo-canvas px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sidebar.Trigger />
            {breadcrumbs ? (
              breadcrumbs
            ) : (
              <Text as="h1" variant="heading" size="lg">
                {title}
              </Text>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {farmSelector ? (
              <FarmSelector
                farms={farmSelector.farms}
                value={farmSelector.farmId}
                onChange={farmSelector.onFarmChange}
                disabled={
                  farmSelector.loading || farmSelector.farms.length === 0
                }
              />
            ) : null}
            <UserMenu email={userEmail} onLogout={onLogout} />
          </div>
        </header>
        <main className="app-main flex-1">{children}</main>
      </div>
    </Sidebar.Provider>
  )
}
