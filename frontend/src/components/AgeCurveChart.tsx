import { Chart, ChartLegend, ChartPalette, LayerCard, Text } from '@cloudflare/kumo'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { useTheme } from '../theme'
import type { AnalyticsComparePayload } from '../types'

echarts.use([LineChart, GridComponent, TooltipComponent, AriaComponent, CanvasRenderer])

type AgeCurveChartProps = {
  curves: AnalyticsComparePayload['age_curves']
  breedCurves: AnalyticsComparePayload['breed_curves']
}

export function AgeCurveChart({ curves, breedCurves }: AgeCurveChartProps) {
  const { isDark } = useTheme()
  const standardColor = ChartPalette.semantic('Disabled', isDark)
  const colors = useMemo(
    () => curves.map((_, i) => ChartPalette.categorical(i % 5, isDark)),
    [curves, isDark],
  )

  const options = useMemo<EChartsOption>(
    () => ({
      animation: false,
      grid: { left: 8, right: 16, top: 8, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => (typeof v === 'number' ? `${v.toFixed(1)}%` : '—'),
      },
      xAxis: {
        type: 'value',
        name: 'Age (weeks)',
        nameLocation: 'middle',
        nameGap: 28,
        min: 18,
        splitLine: { show: false },
      },
      yAxis: { type: 'value', name: 'HDEP %', min: 40, max: 100 },
      series: [
        ...breedCurves.map((breed) => ({
          name: `${breed.name} standard`,
          type: 'line' as const,
          data: breed.points.map((p) => [p.age_week, p.hdep]),
          showSymbol: false,
          lineStyle: { width: 2, type: 'dashed' as const, color: standardColor },
          itemStyle: { color: standardColor },
        })),
        ...curves.map((curve, i) => ({
          name: curve.label,
          type: 'line' as const,
          data: curve.points.map((p) => [p.age_week, p.hdep]),
          showSymbol: false,
          lineStyle: { width: 1.5, color: colors[i] },
          itemStyle: { color: colors[i] },
        })),
      ],
    }),
    [curves, breedCurves, colors, standardColor],
  )

  return (
    <LayerCard className="rounded-lg p-4">
      <Text as="h2" variant="secondary" size="xs" DANGEROUS_className="mb-3 uppercase tracking-wide">
        HDEP by flock age vs breed curve
      </Text>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
        {breedCurves.map((breed) => (
          <ChartLegend.SmallItem key={breed.breed_id} name={`${breed.name} standard`} color={standardColor} value="" />
        ))}
        {curves.map((curve, i) => (
          <ChartLegend.SmallItem key={curve.flock_id} name={curve.label} color={colors[i]} value="" />
        ))}
      </div>
      <div role="img" aria-label="Weekly HDEP of each flock aligned by age in weeks, with the breed standard curve">
        <Chart echarts={echarts} options={options} height={300} isDarkMode={isDark} />
      </div>
    </LayerCard>
  )
}
