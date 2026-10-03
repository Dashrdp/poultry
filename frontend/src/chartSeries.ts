import type { SeriesPoint } from './types'

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

export function labelToTimestamp(label: string, index: number): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return Date.parse(`${label}T00:00:00Z`)
  }
  if (/^W\d+$/i.test(label)) {
    const week = Number(label.slice(1))
    return Date.UTC(2026, 7, 1 + (week - 1) * 7)
  }
  if (label in MONTHS) {
    return Date.UTC(2026, MONTHS[label], 1)
  }
  return Date.UTC(2026, 0, 1 + index)
}

export function seriesToPairs(
  series: SeriesPoint[],
  key: 'eggs' | 'birds',
): [number, number][] {
  return series.map((point, index) => [
    labelToTimestamp(point.label, index),
    point[key],
  ])
}

export function formatChartInt(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}
