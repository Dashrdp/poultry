/** Owner period presets → inclusive ISO from/to (local calendar). */

export type PeriodPreset =
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'year'
  | 'custom'

export type EndCapMode = 'today' | 'yesterday'

export type OwnerPeriod = {
  preset: PeriodPreset
  from: string
  to: string
}

export const PERIOD_PRESETS: { value: Exclude<PeriodPreset, 'custom'>; label: string }[] = [
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'year', label: 'Year' },
]

const DEFAULT_PRESET: Exclude<PeriodPreset, 'custom'> = 'this_month'

function localToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function endCapDate(mode: EndCapMode, now = new Date()): Date {
  const today = localToday(now)
  if (mode === 'yesterday') {
    today.setDate(today.getDate() - 1)
  }
  return today
}

/** Monday of the week containing ``d`` (Mon–Sun weeks). */
export function mondayOf(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
}

export function boundsForPreset(
  preset: Exclude<PeriodPreset, 'custom'>,
  endCapMode: EndCapMode,
  now = new Date(),
): { from: string; to: string } {
  const cap = endCapDate(endCapMode, now)
  const today = localToday(now)

  switch (preset) {
    case 'yesterday': {
      const y = endCapDate('yesterday', now)
      const day = y <= cap ? y : cap
      return { from: toIsoDate(day), to: toIsoDate(day) }
    }
    case 'this_week': {
      const start = mondayOf(cap)
      return { from: toIsoDate(start), to: toIsoDate(cap) }
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = cap < start ? start : cap
      return { from: toIsoDate(start), to: toIsoDate(end) }
    }
    case 'last_month': {
      const firstThis = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastPrev = new Date(firstThis.getFullYear(), firstThis.getMonth(), 0)
      const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1)
      const end = lastPrev > cap ? cap : lastPrev
      return { from: toIsoDate(firstPrev), to: toIsoDate(end < firstPrev ? firstPrev : end) }
    }
    case 'year': {
      const start = new Date(today.getFullYear(), 0, 1)
      const end = cap < start ? start : cap
      return { from: toIsoDate(start), to: toIsoDate(end) }
    }
    default: {
      const _never: never = preset
      return _never
    }
  }
}

export function defaultPeriod(endCapMode: EndCapMode, now = new Date()): OwnerPeriod {
  const bounds = boundsForPreset(DEFAULT_PRESET, endCapMode, now)
  return { preset: DEFAULT_PRESET, ...bounds }
}

export function clampRange(
  from: Date,
  to: Date,
  endCapMode: EndCapMode,
  now = new Date(),
): { from: string; to: string } {
  const cap = endCapDate(endCapMode, now)
  let start = from
  let end = to
  if (start > end) {
    const swap = start
    start = end
    end = swap
  }
  if (end > cap) end = cap
  if (start > end) start = end
  return { from: toIsoDate(start), to: toIsoDate(end) }
}

export function formatPeriodLabel(period: OwnerPeriod): string {
  if (period.from === period.to) {
    return formatShortDay(period.from)
  }
  const a = parseIsoDate(period.from)
  const b = parseIsoDate(period.to)
  const sameYear = a.getFullYear() === b.getFullYear()
  const sameMonth = sameYear && a.getMonth() === b.getMonth()
  if (sameMonth) {
    return `${a.getDate()}–${formatShortDay(period.to)}`
  }
  return `${formatShortDay(period.from)} – ${formatShortDay(period.to)}`
}

function formatShortDay(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const PRESET_SET = new Set<string>(PERIOD_PRESETS.map((p) => p.value))

export function periodFromSearchParams(
  params: URLSearchParams,
  endCapMode: EndCapMode,
  now = new Date(),
): OwnerPeriod {
  const presetRaw = params.get('preset')
  const from = params.get('from')
  const to = params.get('to')

  if (from && to) {
    const clamped = clampRange(parseIsoDate(from), parseIsoDate(to), endCapMode, now)
    const preset: PeriodPreset =
      presetRaw === 'custom' || (presetRaw && PRESET_SET.has(presetRaw))
        ? (presetRaw as PeriodPreset)
        : 'custom'
    if (preset !== 'custom' && PRESET_SET.has(preset)) {
      const expected = boundsForPreset(preset, endCapMode, now)
      if (expected.from === clamped.from && expected.to === clamped.to) {
        return { preset, ...clamped }
      }
    }
    return { preset: 'custom', ...clamped }
  }

  if (presetRaw && PRESET_SET.has(presetRaw)) {
    const bounds = boundsForPreset(presetRaw as Exclude<PeriodPreset, 'custom'>, endCapMode, now)
    return { preset: presetRaw as PeriodPreset, ...bounds }
  }

  return defaultPeriod(endCapMode, now)
}

export function periodToSearchParams(period: OwnerPeriod): URLSearchParams {
  const params = new URLSearchParams()
  params.set('preset', period.preset)
  params.set('from', period.from)
  params.set('to', period.to)
  return params
}

/** Merge period into existing search params (preserves farm_id etc.). */
export function writePeriodToSearchParams(
  current: URLSearchParams,
  period: OwnerPeriod,
): URLSearchParams {
  const next = new URLSearchParams(current)
  next.set('preset', period.preset)
  next.set('from', period.from)
  next.set('to', period.to)
  return next
}
