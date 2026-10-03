import { Button } from '@cloudflare/kumo'
import type { RankMetric } from '../types'

const OPTIONS: { value: RankMetric; label: string; farmsOnly?: boolean }[] = [
  { value: 'hen_day', label: 'Hen-day %' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'margin', label: 'Margin', farmsOnly: true },
]

type RankToggleProps = {
  value: RankMetric
  onChange: (metric: RankMetric) => void
  /** When true, Margin is available (farm compare). Sheds omit it. */
  includeMargin?: boolean
}

export function RankToggle({
  value,
  onChange,
  includeMargin = true,
}: RankToggleProps) {
  const options = includeMargin
    ? OPTIONS
    : OPTIONS.filter((opt) => !opt.farmsOnly)

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Rank by">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Button
            key={opt.value}
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
