import { Chart, ChartPalette, LayerCard } from '@cloudflare/kumo'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { useTheme } from '../theme'

// Tree-shake ECharts modules per https://kumo-ui.com/charts/
echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
  AriaComponent,
])

export type PerformanceBarItem = {
  id: string
  label: string
  value: number | null
}

type PerformanceBarChartProps = {
  items: PerformanceBarItem[]
  valueLabel: string
  highlightId?: string
  ariaDescription: string
}

export function PerformanceBarChart({
  items,
  valueLabel,
  highlightId,
  ariaDescription,
}: PerformanceBarChartProps) {
  const { isDark } = useTheme()

  const options = useMemo<EChartsOption>(() => {
    const labels = items.map((item) => item.label)
    const values = items.map((item) =>
      item.value === null ? 0 : item.value,
    )
    const colors = items.map((_, index) =>
      ChartPalette.categorical(index % 5, isDark),
    )

    return {
      animation: true,
      animationDuration: 400,
      grid: {
        left: 8,
        right: 48,
        top: 8,
        bottom: 8,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      xAxis: {
        type: 'value',
        name: valueLabel,
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: labels,
        inverse: true,
        axisLabel: {
          width: 120,
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          data: values.map((value, index) => ({
            value,
            itemStyle: {
              color: colors[index],
              opacity:
                highlightId && items[index]?.id !== highlightId ? 0.45 : 1,
            },
          })),
          barMaxWidth: 28,
        },
      ],
    }
  }, [items, valueLabel, highlightId, isDark])

  const height = Math.max(160, items.length * 40 + 48)

  return (
    <LayerCard className="rounded-lg p-4">
      <div role="img" aria-label={ariaDescription}>
        <Chart
          echarts={echarts}
          options={options}
          height={height}
          isDarkMode={isDark}
        />
      </div>
    </LayerCard>
  )
}
