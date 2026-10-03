import { LayerCard, Text, Tooltip } from '@cloudflare/kumo'
import { Link } from 'react-router-dom'
import type { ShedSummary } from '../types'

type ShedMapProps = {
  sheds: ShedSummary[]
  farmId: string
}

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}

export function ShedMap({ sheds, farmId }: ShedMapProps) {
  return (
    <LayerCard className="rounded-lg p-4" aria-label="Farm shed top view">
      <div className="shed-map__yard">
        {sheds.map((shed) => {
          const href = `/farms/${farmId}/sheds/${shed.id}`
          const tile = (
            <>
              <div className="flex w-full items-baseline justify-between gap-2">
                <Text as="span" variant="heading" size="lg">
                  {shed.number}
                </Text>
                <Text as="span" variant="secondary" size="xs" DANGEROUS_className="truncate">
                  {shed.name}
                </Text>
              </div>
              <div className="mt-2 flex w-full flex-col gap-0.5 text-left">
                <Text as="span" size="sm">
                  {formatInt(shed.bird_count)} birds
                </Text>
                <Text as="span" size="sm" variant="secondary">
                  {formatInt(shed.eggs_today)} eggs today
                </Text>
                <Text as="span" size="xs" variant="secondary">
                  Last log: {shed.last_log_date || '—'}
                </Text>
              </div>
            </>
          )

          return (
            <Tooltip
              key={shed.id}
              side="top"
              delay={200}
              content={
                <div className="space-y-1 text-left text-xs">
                  <div className="font-semibold">{shed.name}</div>
                  <div>Birds: {formatInt(shed.bird_count)}</div>
                  <div>Eggs today: {formatInt(shed.eggs_today)}</div>
                  <div>Last log: {shed.last_log_date || '—'}</div>
                  <div>Open shed log</div>
                </div>
              }
              render={
                <Link
                  to={href}
                  className="shed-tile w-full rounded-md border border-kumo-line bg-kumo-base p-3 text-left no-underline transition-colors hover:bg-kumo-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
                />
              }
            >
              {tile}
            </Tooltip>
          )
        })}
      </div>
    </LayerCard>
  )
}
