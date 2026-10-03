import {
  ChartLegend,
  ChartPalette,
  LayerCard,
  Text,
  TimeseriesChart,
} from '@cloudflare/kumo'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useMemo } from 'react'
import { formatChartInt, seriesToPairs } from '../chartSeries'
import { useTheme } from '../theme'
import type { SeriesPoint } from '../types'

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
  AriaComponent,
])

type MetricKey = 'eggs' | 'birds'

const SEMANTIC: Record<MetricKey, 'Neutral' | 'Attention'> = {
  eggs: 'Neutral',
  birds: 'Attention',
}

type MetricTrendChartProps = {
  series: SeriesPoint[]
  metric: MetricKey
  title: string
  loading?: boolean
  height?: number
}

export function MetricTrendChart({
  series,
  metric,
  title,
  loading,
  height = 240,
}: MetricTrendChartProps) {
  const { isDark } = useTheme()
  const color = ChartPalette.semantic(SEMANTIC[metric], isDark)

  const chartData = useMemo(
    () => [
      {
        name: title,
        color,
        data: seriesToPairs(series, metric),
      },
    ],
    [series, metric, title, color],
  )

  const latest = series.at(-1)?.[metric] ?? 0

  return (
    <LayerCard className="rounded-lg p-4">
      <Text
        as="h2"
        variant="secondary"
        size="xs"
        DANGEROUS_className="mb-3 uppercase tracking-wide"
      >
        {title}
      </Text>
      <div className="mb-3">
        <ChartLegend.SmallItem
          name={title}
          color={color}
          value={formatChartInt(latest)}
          loading={loading}
        />
      </div>
      <TimeseriesChart
        echarts={echarts}
        type="line"
        data={chartData}
        height={height}
        gradient
        loading={loading}
        isDarkMode={isDark}
        yAxisMinInterval={1}
        tooltipValueFormat={(value) => formatChartInt(value)}
        ariaDescription={`${title} trend for the selected farm and range`}
      />
    </LayerCard>
  )
}
