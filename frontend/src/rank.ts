import type { CompareFarmRow, CompareShedRow, RankMetric } from './types'

function metricValue(
  row: CompareShedRow | CompareFarmRow,
  metric: RankMetric,
): number | null {
  switch (metric) {
    case 'hen_day':
      return row.hen_day_pct
    case 'eggs':
      return row.eggs_period
    case 'margin':
      return 'margin' in row ? row.margin : null
    default: {
      const _exhaustive: never = metric
      return _exhaustive
    }
  }
}

/** Descending sort; nulls last. Stable by name for ties. */
export function sortByRank<T extends CompareShedRow | CompareFarmRow>(
  rows: T[],
  metric: RankMetric,
): T[] {
  return [...rows].sort((a, b) => {
    const av = metricValue(a, metric)
    const bv = metricValue(b, metric)
    if (av === null && bv === null) {
      return a.name.localeCompare(b.name)
    }
    if (av === null) return 1
    if (bv === null) return -1
    if (bv !== av) return bv - av
    return a.name.localeCompare(b.name)
  })
}

export function formatRankMetric(
  row: CompareShedRow | CompareFarmRow,
  metric: RankMetric,
): string {
  const value = metricValue(row, metric)
  if (value === null) return '—'
  switch (metric) {
    case 'hen_day':
      return `${value.toFixed(1)}%`
    case 'eggs':
      return new Intl.NumberFormat('en-IN').format(value)
    case 'margin':
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(value)
    default: {
      const _exhaustive: never = metric
      return _exhaustive
    }
  }
}

export function rankMetricLabel(metric: RankMetric): string {
  switch (metric) {
    case 'hen_day':
      return 'hen-day %'
    case 'eggs':
      return 'eggs'
    case 'margin':
      return 'margin'
    default: {
      const _exhaustive: never = metric
      return _exhaustive
    }
  }
}
