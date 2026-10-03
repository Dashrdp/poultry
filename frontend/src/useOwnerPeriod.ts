import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  type EndCapMode,
  type OwnerPeriod,
  type PeriodPreset,
  boundsForPreset,
  clampRange,
  defaultPeriod,
  parseIsoDate,
  periodFromSearchParams,
  writePeriodToSearchParams,
} from './period'

export function useOwnerPeriod(endCapMode: EndCapMode) {
  const [searchParams, setSearchParams] = useSearchParams()

  const period = useMemo(
    () => periodFromSearchParams(searchParams, endCapMode),
    [searchParams, endCapMode],
  )

  const setPeriod = useCallback(
    (next: OwnerPeriod) => {
      setSearchParams(writePeriodToSearchParams(searchParams, next), { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const selectPreset = useCallback(
    (preset: Exclude<PeriodPreset, 'custom'>) => {
      const bounds = boundsForPreset(preset, endCapMode)
      setPeriod({ preset, ...bounds })
    },
    [endCapMode, setPeriod],
  )

  const selectCustomRange = useCallback(
    (from: Date, to: Date) => {
      const bounds = clampRange(from, to, endCapMode)
      setPeriod({ preset: 'custom', ...bounds })
    },
    [endCapMode, setPeriod],
  )

  const ensureDefaultInUrl = useCallback(() => {
    if (searchParams.get('from') && searchParams.get('to')) return
    const next = defaultPeriod(endCapMode)
    setSearchParams(writePeriodToSearchParams(searchParams, next), { replace: true })
  }, [endCapMode, searchParams, setSearchParams])

  return {
    period,
    setPeriod,
    selectPreset,
    selectCustomRange,
    ensureDefaultInUrl,
    fromDate: parseIsoDate(period.from),
    toDate: parseIsoDate(period.to),
  }
}
