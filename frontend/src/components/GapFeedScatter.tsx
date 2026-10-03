import { Chart, ChartLegend, ChartPalette, LayerCard, Text } from '@cloudflare/kumo'
import * as echarts from 'echarts/core'
import { ScatterChart } from 'echarts/charts'
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { gapStatus, gapStatusLabel } from '../analyticsFormat'
import { useTheme } from '../theme'
import type { AnalyticsCompareRow, GapStatus } from '../types'

echarts.use([ScatterChart, GridComponent, TooltipComponent, AriaComponent, CanvasRenderer])

const STATUSES: Exclude<GapStatus, 'unknown'>[] = ['good', 'watch', 'bad']

function statusToken(status: Exclude<GapStatus, 'unknown'>): 'Success' | 'Warning' | 'Attention' {
  switch (status) {
    case 'good':
      return 'Success'
    case 'watch':
      return 'Warning'
    case 'bad':
      return 'Attention'
    default: {
      const never: never = status
      return never
    }
  }
}

type GapFeedScatterProps = {
  rows: AnalyticsCompareRow[]
  level: 'shed' | 'farm'
}

export function GapFeedScatter({ rows, level }: GapFeedScatterProps) {
  const { isDark } = useTheme()

  const options = useMemo<EChartsOption>(() => {
    const plotted = rows.filter((r) => r.gap !== null && r.feed_per_10_eggs !== null)
    return {
      animation: false,
      grid: { left: 8, right: 16, top: 16, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params
          const [gap, feed, name] = p.value as [number, number, string]
          return `${name}<br/>Gap ${gap.toFixed(1)} pts · ${feed.toFixed(2)} kg / 10 eggs`
        },
      },
      xAxis: {
        type: 'value',
        name: 'Gap to standard (pts)',
        nameLocation: 'middle',
        nameGap: 28,
        splitLine: { show: false },
      },
      yAxis: { type: 'value', name: 'kg feed / 10 eggs', scale: true },
      series: STATUSES.map((status) => {
        const color = ChartPalette.semantic(statusToken(status), isDark)
        return {
          name: gapStatusLabel(status),
          type: 'scatter' as const,
          symbolSize: 12,
          itemStyle: { color },
          data: plotted
            .filter((r) => gapStatus(r.gap) === status)
            .map((r) => [
              r.gap,
              r.feed_per_10_eggs,
              level === 'shed' ? `${r.farm_name} · ${r.name}` : r.name,
            ]),
        }
      }),
    }
  }, [rows, level, isDark])

  return (
    <LayerCard className="rounded-lg p-4">
      <Text as="h2" variant="secondary" size="xs" DANGEROUS_className="mb-3 uppercase tracking-wide">
        Gap to standard vs feed per 10 eggs
      </Text>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
        {STATUSES.map((status) => (
          <ChartLegend.SmallItem
            key={status}
            name={gapStatusLabel(status)}
            color={ChartPalette.semantic(statusToken(status), isDark)}
            value=""
          />
        ))}
      </div>
      <div role="img" aria-label="Scatter of production gap against feed efficiency; bottom-right is best">
        <Chart echarts={echarts} options={options} height={300} isDarkMode={isDark} />
      </div>
      <Text as="p" variant="secondary" size="xs" DANGEROUS_className="mt-2">
        Bottom-right is best: on standard and lean on feed.
      </Text>
    </LayerCard>
  )
}
