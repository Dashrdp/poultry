import {
  ChartLegend,
  ChartPalette,
  LayerCard,
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

type EggsChartProps = {
  series: SeriesPoint[]
  loading?: boolean
}

export function EggsChart({ series, loading }: EggsChartProps) {
  const { isDark } = useTheme()

  const chartData = useMemo(() => {
    const eggsColor = ChartPalette.semantic('Neutral', isDark)
    const birdsColor = ChartPalette.semantic('Attention', isDark)
    return [
      {
        name: 'Eggs',
        color: eggsColor,
        data: seriesToPairs(series, 'eggs'),
      },
      {
        name: 'Birds',
        color: birdsColor,
        data: seriesToPairs(series, 'birds'),
      },
    ]
  }, [series, isDark])

  const latestEggs = series.at(-1)?.eggs ?? 0
  const latestBirds = series.at(-1)?.birds ?? 0
  const eggsColor = chartData[0]?.color ?? ''
  const birdsColor = chartData[1]?.color ?? ''

  return (
    <LayerCard className="rounded-lg p-4">
      <div className="mb-4 flex flex-wrap gap-4">
        <ChartLegend.SmallItem
          name="Eggs"
          color={eggsColor}
          value={formatChartInt(latestEggs)}
          loading={loading}
        />
        <ChartLegend.SmallItem
          name="Birds"
          color={birdsColor}
          value={formatChartInt(latestBirds)}
          loading={loading}
        />
      </div>
      <TimeseriesChart
        echarts={echarts}
        type="line"
        data={chartData}
        height={280}
        gradient
        loading={loading}
        isDarkMode={isDark}
        yAxisName="Count"
        yAxisMinInterval={1}
        tooltipValueFormat={(value) => formatChartInt(value)}
        ariaDescription="Egg and bird trend for the selected farm and range"
      />
    </LayerCard>
  )
}
