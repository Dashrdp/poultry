import { Empty, Text } from '@cloudflare/kumo'
import type { CompareFarmRow, CompareShedRow } from '../types'

type CompareTablesProps = {
  sheds: CompareShedRow[]
  farms: CompareFarmRow[]
  currentFarmId: string
  showRank?: boolean
}

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}

function formatHenDay(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)}%`
}

function formatMargin(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function CompareTables({
  sheds,
  farms,
  currentFarmId,
  showRank = false,
}: CompareTablesProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Text
          as="h2"
          variant="secondary"
          size="xs"
          DANGEROUS_className="mb-3 uppercase tracking-wide"
        >
          Shed compare
        </Text>
        {sheds.length === 0 ? (
          <Empty size="sm" title="No sheds" description="Add sheds to compare production." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-kumo-line bg-kumo-elevated">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-kumo-line bg-kumo-tint">
                <tr>
                  {showRank ? (
                    <th className="px-4 py-3 font-medium text-kumo-secondary">#</th>
                  ) : null}
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Shed</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Birds</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Eggs</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Deaths</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Hen-day</th>
                </tr>
              </thead>
              <tbody>
                {sheds.map((row, index) => (
                  <tr key={row.id} className="border-b border-kumo-line last:border-b-0">
                    {showRank ? (
                      <td className="px-4 py-3 text-kumo-secondary">{index + 1}</td>
                    ) : null}
                    <td className="px-4 py-3 font-medium text-kumo-default">
                      {row.number}. {row.name}
                    </td>
                    <td className="px-4 py-3 text-kumo-secondary">{formatInt(row.birds)}</td>
                    <td className="px-4 py-3 text-kumo-secondary">{formatInt(row.eggs_period)}</td>
                    <td className="px-4 py-3 text-kumo-secondary">{formatInt(row.deaths_period)}</td>
                    <td className="px-4 py-3 text-kumo-secondary">{formatHenDay(row.hen_day_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <Text
          as="h2"
          variant="secondary"
          size="xs"
          DANGEROUS_className="mb-3 uppercase tracking-wide"
        >
          Farm compare
        </Text>
        {farms.length === 0 ? (
          <Empty size="sm" title="No farms" description="No farms available to compare." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-kumo-line bg-kumo-elevated">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-kumo-line bg-kumo-tint">
                <tr>
                  {showRank ? (
                    <th className="px-4 py-3 font-medium text-kumo-secondary">#</th>
                  ) : null}
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Farm</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Birds</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Eggs</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Deaths</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Hen-day</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Margin</th>
                </tr>
              </thead>
              <tbody>
                {farms.map((row, index) => {
                  const isCurrent = row.id === currentFarmId
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-kumo-line last:border-b-0 ${
                        isCurrent ? 'bg-kumo-tint' : ''
                      }`}
                    >
                      {showRank ? (
                        <td className="px-4 py-3 text-kumo-secondary">{index + 1}</td>
                      ) : null}
                      <td className="px-4 py-3 font-medium text-kumo-default">
                        {row.name}
                        {isCurrent ? (
                          <Text as="span" variant="secondary" size="xs" DANGEROUS_className="ml-2">
                            current
                          </Text>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-kumo-secondary">{formatInt(row.birds)}</td>
                      <td className="px-4 py-3 text-kumo-secondary">{formatInt(row.eggs_period)}</td>
                      <td className="px-4 py-3 text-kumo-secondary">{formatInt(row.deaths_period)}</td>
                      <td className="px-4 py-3 text-kumo-secondary">{formatHenDay(row.hen_day_pct)}</td>
                      <td className="px-4 py-3 text-kumo-secondary">{formatMargin(row.margin)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
