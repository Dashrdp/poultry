import { Chart, ChartPalette } from '@cloudflare/kumo'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { formatDayLabel } from '../analyticsFormat'
import { useTheme } from '../theme'
import type { WeeklyHdepPoint } from '../types'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

type HdepSparklineProps = {
  points: WeeklyHdepPoint[]
  label: string
}

export function HdepSparkline({ points, label }: HdepSparklineProps) {
  const { isDark } = useTheme()

  const options = useMemo<EChartsOption>(() => {
    const actual = ChartPalette.semantic('Neutral', isDark)
    const standard = ChartPalette.semantic('Disabled', isDark)
    const weeks = points.map((p) => formatDayLabel(p.week_start))
    return {
      animation: false,
      grid: { left: 0, right: 0, top: 4, bottom: 0 },
      tooltip: { trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `${v}%`) },
      xAxis: { type: 'category', data: weeks, show: false },
      yAxis: { type: 'value', show: false, scale: true },
      series: [
        {
          name: 'Standard',
          type: 'line',
          data: points.map((p) => p.std_hdep),
          showSymbol: false,
          lineStyle: { width: 1, type: 'dashed', color: standard },
          itemStyle: { color: standard },
        },
        {
          name: 'HDEP',
          type: 'line',
          data: points.map((p) => p.hdep),
          showSymbol: false,
          lineStyle: { width: 1.5, color: actual },
          itemStyle: { color: actual },
        },
      ],
    }
  }, [points, isDark])

  return (
    <div role="img" aria-label={`${label}: weekly HDEP vs standard, last 8 weeks`}>
      <Chart echarts={echarts} options={options} height={56} isDarkMode={isDark} />
    </div>
  )
}
