import { Button } from '@cloudflare/kumo'

type PeriodToggleProps<T extends string | number> = {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  ariaLabel: string
}

export function PeriodToggle<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: PeriodToggleProps<T>) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Button
            key={String(opt.value)}
            type="button"
            size="sm"
            variant={active ? 'primary' : 'ghost'}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        )
      })}
    </div>
  )
}
