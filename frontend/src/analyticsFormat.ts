import type { BadgeVariant } from '@cloudflare/kumo'
import type { GapStatus, KpiUnit } from './types'

const GAP_WATCH = -3
const GAP_BAD = -5

export function gapStatus(gap: number | null): GapStatus {
  if (gap === null) return 'unknown'
  if (gap < GAP_BAD) return 'bad'
  if (gap < GAP_WATCH) return 'watch'
  return 'good'
}

export function gapStatusLabel(status: GapStatus): string {
  switch (status) {
    case 'good':
      return 'On standard'
    case 'watch':
      return 'Watch'
    case 'bad':
      return 'Below standard'
    case 'unknown':
      return 'No data'
    default: {
      const never: never = status
      return never
    }
  }
}

export function gapBadgeVariant(status: GapStatus): BadgeVariant {
  switch (status) {
    case 'good':
      return 'success'
    case 'watch':
      return 'warning'
    case 'bad':
      return 'error'
    case 'unknown':
      return 'neutral'
    default: {
      const never: never = status
      return never
    }
  }
}

export function gapTextClass(gap: number | null): string {
  const status = gapStatus(gap)
  switch (status) {
    case 'good':
      return 'text-kumo-success'
    case 'watch':
      return 'text-kumo-warning'
    case 'bad':
      return 'text-kumo-danger'
    case 'unknown':
      return 'text-kumo-secondary'
    default: {
      const never: never = status
      return never
    }
  }
}

const intFormat = new Intl.NumberFormat('en-IN')

export function formatInt(value: number | null): string {
  return value === null ? '—' : intFormat.format(Math.round(value))
}

export function formatPct(value: number | null, digits = 1): string {
  return value === null ? '—' : `${value.toFixed(digits)}%`
}

export function formatGap(value: number | null): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} pts`
}

export function formatDecimal(value: number | null, digits = 2): string {
  return value === null ? '—' : value.toFixed(digits)
}

export function formatKpi(value: number | null, unit: KpiUnit): string {
  switch (unit) {
    case 'birds':
    case 'eggs':
      return formatInt(value)
    case 'pct':
      return formatPct(value, value !== null && Math.abs(value) < 1 ? 3 : 1)
    case 'points':
      return formatGap(value)
    case 'g':
      return value === null ? '—' : `${value.toFixed(1)} g`
    case 'days':
      return value === null ? '—' : `${value.toFixed(1)} days`
    default: {
      const never: never = unit
      return never
    }
  }
}

export function formatDayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function isoToTimestamp(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}
