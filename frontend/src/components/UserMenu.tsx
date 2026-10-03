import { DropdownMenu, Text } from '@cloudflare/kumo'
import { MoonIcon, SignOutIcon, SunIcon } from '@phosphor-icons/react'
import { useTheme, type ColorMode } from '../theme'

type UserMenuProps = {
  email?: string
  onLogout?: () => void
}

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return local.slice(0, 2).toUpperCase() || '?'
}

export function UserMenu({ email, onLogout }: UserMenuProps) {
  const { mode, setMode } = useTheme()
  const initials = email ? initialsFromEmail(email) : '?'

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={
          <button
            type="button"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
            aria-label="Account menu"
          />
        }
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-kumo-brand text-sm font-medium text-white">
          {initials}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {email ? (
          <DropdownMenu.Group>
            <DropdownMenu.Label>
              <span className="flex max-w-56 flex-col gap-0.5 py-0.5">
                <Text as="span" size="xs" variant="secondary">
                  Signed in as
                </Text>
                <Text as="span" size="sm" DANGEROUS_className="truncate">
                  {email}
                </Text>
              </span>
            </DropdownMenu.Label>
          </DropdownMenu.Group>
        ) : null}

        <DropdownMenu.Separator />

        <DropdownMenu.Group>
          <DropdownMenu.Label>Theme</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as ColorMode)}
          >
            <DropdownMenu.RadioItem value="light" icon={SunIcon}>
              Light
              <DropdownMenu.RadioItemIndicator />
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="dark" icon={MoonIcon}>
              Dark
              <DropdownMenu.RadioItemIndicator />
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Group>

        <DropdownMenu.Separator />

        <DropdownMenu.Item
          icon={SignOutIcon}
          variant="danger"
          disabled={!onLogout}
          onClick={() => onLogout?.()}
        >
          Log out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
