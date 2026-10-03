import { Button, DatePicker, Popover, Text } from '@cloudflare/kumo'
import type { DateRange } from '@cloudflare/kumo'
import { useEffect, useState } from 'react'
import {
  PERIOD_PRESETS,
  type EndCapMode,
  type OwnerPeriod,
  endCapDate,
  formatPeriodLabel,
} from '../period'
import { useOwnerPeriod } from '../useOwnerPeriod'

type AnalyticsPeriodBarProps = {
  endCapMode: EndCapMode
  ariaLabel?: string
}

/**
 * Design Read: ops dashboard toolbar chrome for Owner; Cloudflare/Kumo; VARIANCE 4 / MOTION 3 / DENSITY 6.
 */
export function AnalyticsPeriodBar({
  endCapMode,
  ariaLabel = 'Report period',
}: AnalyticsPeriodBarProps) {
  const { period, selectPreset, selectCustomRange, ensureDefaultInUrl } =
    useOwnerPeriod(endCapMode)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>()

  useEffect(() => {
    ensureDefaultInUrl()
  }, [ensureDefaultInUrl])

  useEffect(() => {
    if (!open) return
    setDraft({
      from: new Date(`${period.from}T00:00:00`),
      to: new Date(`${period.to}T00:00:00`),
    })
  }, [open, period.from, period.to])

  const cap = endCapDate(endCapMode)

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ariaLabel}>
      <div className="flex flex-wrap gap-1">
        {PERIOD_PRESETS.map((opt) => {
          const active = period.preset === opt.value
          return (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={active ? 'primary' : 'ghost'}
              aria-pressed={active}
              onClick={() => selectPreset(opt.value)}
            >
              {opt.label}
            </Button>
          )
        })}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          render={
            <Button
              type="button"
              size="sm"
              variant={period.preset === 'custom' ? 'primary' : 'secondary'}
            >
              Custom
            </Button>
          }
        />
        <Popover.Content align="end" side="bottom" className="p-3">
          <Popover.Title className="sr-only">Custom date range</Popover.Title>
          <DatePicker
            mode="range"
            numberOfMonths={2}
            selected={draft}
            onChange={(range) => {
              setDraft(range)
            }}
            disabled={{ after: cap }}
            defaultMonth={new Date(`${period.from}T00:00:00`)}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!draft?.from}
              onClick={() => {
                if (!draft?.from) return
                const end = draft.to ?? draft.from
                selectCustomRange(draft.from, end)
                setOpen(false)
              }}
            >
              Apply
            </Button>
          </div>
        </Popover.Content>
      </Popover>

      <Text as="span" variant="secondary" size="xs" DANGEROUS_className="tabular-nums">
        {formatPeriodLabel(period)}
      </Text>
    </div>
  )
}

export type { OwnerPeriod }
