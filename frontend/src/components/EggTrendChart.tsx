import { Chart, ChartLegend, ChartPalette, LayerCard, Text } from '@cloudflare/kumo'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { formatDayLabel, formatInt } from '../analyticsFormat'
import { useTheme } from '../theme'
import type { EggTrendPoint } from '../types'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, AriaComponent, CanvasRenderer])

type EggTrendChartProps = {
  points: EggTrendPoint[]
  farms: { id: string; name: string }[]
  loading?: boolean
}

export function EggTrendChart({ points, farms, loading }: EggTrendChartProps) {
  const { isDark } = useTheme()
  const farmColors = useMemo(
    () => farms.map((_, i) => ChartPalette.categorical(i % 5, isDark)),
    [farms, isDark],
  )
  const expectedColor = ChartPalette.semantic('Disabled', isDark)

  const options = useMemo<EChartsOption>(
    () => ({
      animation: false,
      grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => formatInt(typeof v === 'number' ? v : null),
      },
      xAxis: {
        type: 'category',
        data: points.map((p) => formatDayLabel(p.date)),
        axisTick: { show: false },
      },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { opacity: 0.4 } } },
      series: [
        ...farms.map((farm, i) => ({
          name: farm.name,
          type: 'bar' as const,
          stack: 'eggs',
          data: points.map((p) => p.by_farm[farm.id] ?? 0),
          itemStyle: { color: farmColors[i] },
          barMaxWidth: 18,
        })),
        {
          name: 'Expected at standard',
          type: 'line' as const,
          data: points.map((p) => p.expected),
          showSymbol: false,
          lineStyle: { width: 1.5, type: 'dashed' as const, color: expectedColor },
          itemStyle: { color: expectedColor },
        },
      ],
    }),
    [points, farms, farmColors, expectedColor],
  )

  const last = points.at(-1)

  return (
    <LayerCard className="rounded-lg p-4">
      <Text as="h2" variant="secondary" size="xs" DANGEROUS_className="mb-3 uppercase tracking-wide">
        Eggs per day by farm
      </Text>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
        {farms.map((farm, i) => (
          <ChartLegend.SmallItem
            key={farm.id}
            name={farm.name}
            color={farmColors[i]}
            value={formatInt(last?.by_farm[farm.id] ?? 0)}
            loading={loading}
          />
        ))}
        <ChartLegend.SmallItem
          name="Expected at standard"
          color={expectedColor}
          value={formatInt(last?.expected ?? null)}
          loading={loading}
        />
      </div>
      <div role="img" aria-label="Daily eggs stacked by farm with the breed-standard expected line">
        <Chart echarts={echarts} options={options} height={260} isDarkMode={isDark} />
      </div>
    </LayerCard>
  )
}
