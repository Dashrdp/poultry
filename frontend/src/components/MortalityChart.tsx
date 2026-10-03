import { Chart, ChartLegend, ChartPalette, LayerCard, Text } from '@cloudflare/kumo'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { formatDayLabel } from '../analyticsFormat'
import { useTheme } from '../theme'
import type { ShedDailyPoint } from '../types'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, AriaComponent, CanvasRenderer])

const ROLLING_DAYS = 7

function rollingAverage(values: number[]): number[] {
  return values.map((_, i) => {
    const window = values.slice(Math.max(0, i - ROLLING_DAYS + 1), i + 1)
    return Math.round((window.reduce((sum, v) => sum + v, 0) / window.length) * 10) / 10
  })
}

export function MortalityChart({ daily }: { daily: ShedDailyPoint[] }) {
  const { isDark } = useTheme()
  const deathsColor = ChartPalette.semantic('Attention', isDark)
  const avgColor = ChartPalette.semantic('Neutral', isDark)
  const deaths = useMemo(() => daily.map((d) => d.deaths), [daily])
  const rolling = useMemo(() => rollingAverage(deaths), [deaths])

  const options = useMemo<EChartsOption>(
    () => ({
      animation: false,
      grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: daily.map((d) => formatDayLabel(d.date)),
        axisTick: { show: false },
      },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { opacity: 0.4 } } },
      series: [
        {
          name: 'Deaths',
          type: 'bar',
          data: deaths,
          itemStyle: { color: deathsColor },
          barMaxWidth: 14,
        },
        {
          name: '7-day average',
          type: 'line',
          data: rolling,
          showSymbol: false,
          lineStyle: { width: 1.5, color: avgColor },
          itemStyle: { color: avgColor },
        },
      ],
    }),
    [daily, deaths, rolling, deathsColor, avgColor],
  )

  return (
    <LayerCard className="rounded-lg p-4">
      <Text as="h2" variant="secondary" size="xs" DANGEROUS_className="mb-3 uppercase tracking-wide">
        Mortality
      </Text>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
        <ChartLegend.SmallItem name="Deaths" color={deathsColor} value={String(deaths.at(-1) ?? 0)} />
        <ChartLegend.SmallItem name="7-day average" color={avgColor} value={String(rolling.at(-1) ?? 0)} />
      </div>
      <div role="img" aria-label="Daily deaths with a 7-day rolling average">
        <Chart echarts={echarts} options={options} height={220} isDarkMode={isDark} />
      </div>
    </LayerCard>
  )
}
