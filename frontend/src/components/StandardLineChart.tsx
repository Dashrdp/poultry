import { ChartLegend, ChartPalette, LayerCard, Text, TimeseriesChart } from '@cloudflare/kumo'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useMemo } from 'react'
import { isoToTimestamp } from '../analyticsFormat'
import { useTheme } from '../theme'

echarts.use([LineChart, GridComponent, TooltipComponent, AriaComponent, CanvasRenderer])

export type StandardPoint = {
  date: string
  actual: number | null
  standard: number | null
}

type StandardLineChartProps = {
  title: string
  actualLabel: string
  points: StandardPoint[]
  format: (value: number) => string
  loading?: boolean
}

function pairs(points: StandardPoint[], key: 'actual' | 'standard'): [number, number][] {
  return points.flatMap((p) => {
    const value = p[key]
    return value === null ? [] : [[isoToTimestamp(p.date), value] as [number, number]]
  })
}

export function StandardLineChart({ title, actualLabel, points, format, loading }: StandardLineChartProps) {
  const { isDark } = useTheme()
  const actualColor = ChartPalette.semantic('Neutral', isDark)
  const standardColor = ChartPalette.semantic('Disabled', isDark)

  const data = useMemo(
    () => [
      { name: 'Breed standard', color: standardColor, data: pairs(points, 'standard') },
      { name: actualLabel, color: actualColor, data: pairs(points, 'actual') },
    ],
    [points, actualLabel, actualColor, standardColor],
  )

  const last = points.at(-1)

  return (
    <LayerCard className="rounded-lg p-4">
      <Text as="h2" variant="secondary" size="xs" DANGEROUS_className="mb-3 uppercase tracking-wide">
        {title}
      </Text>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
        <ChartLegend.SmallItem
          name={actualLabel}
          color={actualColor}
          value={last?.actual == null ? '—' : format(last.actual)}
          loading={loading}
        />
        <ChartLegend.SmallItem
          name="Breed standard"
          color={standardColor}
          value={last?.standard == null ? '—' : format(last.standard)}
          loading={loading}
        />
      </div>
      <TimeseriesChart
        echarts={echarts}
        type="line"
        data={data}
        height={220}
        loading={loading}
        isDarkMode={isDark}
        tooltipValueFormat={format}
        ariaDescription={`${title}: daily actual against breed standard`}
      />
    </LayerCard>
  )
}
