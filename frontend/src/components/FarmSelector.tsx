import { Select } from '@cloudflare/kumo'
import type { Farm } from '../types'

type FarmSelectorProps = {
  farms: Farm[]
  value: string
  onChange: (farmId: string) => void
  disabled?: boolean
}

export function FarmSelector({
  farms,
  value,
  onChange,
  disabled,
}: FarmSelectorProps) {
  return (
    <Select
      aria-label="Select farm"
      className="farm-select min-w-[12rem] sm:min-w-[16rem]"
      disabled={disabled}
      items={farms.map((farm) => ({
        label: farm.name,
        value: farm.id,
      }))}
      placeholder="Select farm"
      size="sm"
      value={value || null}
      onValueChange={(next) => {
        if (typeof next === 'string' && next) {
          onChange(next)
        }
      }}
    />
  )
}
