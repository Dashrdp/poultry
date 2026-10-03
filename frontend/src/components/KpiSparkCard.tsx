import { Chart, ChartPalette, LayerCard, Text } from '@cloudflare/kumo'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { seriesToPairs } from '../chartSeries'
import { useTheme } from '../theme'
import type { SeriesPoint } from '../types'

echarts.use([LineChart, GridComponent, CanvasRenderer])

type SparkMetric = 'eggs' | 'birds'

type KpiSparkCardProps = {
  label: string
  value: string
  series?: SeriesPoint[]
  sparkMetric?: SparkMetric
}

export function KpiSparkCard({
  label,
  value,
  series,
  sparkMetric,
}: KpiSparkCardProps) {
  const { isDark } = useTheme()
  const hasSpark =
    series !== undefined &&
    series.length > 0 &&
    sparkMetric !== undefined

  const color = ChartPalette.semantic(
    sparkMetric === 'birds' ? 'Attention' : 'Neutral',
    isDark,
  )

  const options = useMemo<EChartsOption>(() => {
    if (!hasSpark || !series || !sparkMetric) return {}
    const pairs = seriesToPairs(series, sparkMetric)
    return {
      animation: false,
      grid: { left: 0, right: 0, top: 4, bottom: 0 },
      xAxis: { type: 'time', show: false },
      yAxis: { type: 'value', show: false, scale: true },
      series: [
        {
          type: 'line',
          data: pairs,
          showSymbol: false,
          lineStyle: { width: 1.5, color },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color },
                { offset: 1, color: 'transparent' },
              ],
            },
            opacity: 0.25,
          },
        },
      ],
    }
  }, [hasSpark, series, sparkMetric, color])

  return (
    <LayerCard className="rounded-lg p-4">
      <Text as="p" variant="secondary" size="xs">
        {label}
      </Text>
      <Text as="p" variant="heading" size="lg" DANGEROUS_className="mt-1">
        {value}
      </Text>
      {hasSpark ? (
        <div className="mt-2" role="img" aria-label={`${label} sparkline`}>
          <Chart
            echarts={echarts}
            options={options}
            height={56}
            isDarkMode={isDark}
          />
        </div>
      ) : null}
    </LayerCard>
  )
}
