import { Banner, Text } from '@cloudflare/kumo'
import { Link } from 'react-router-dom'
import type { DashboardAlert } from '../types'

type AlertsPanelProps = {
  alerts: DashboardAlert[]
  farmId: string
}

function alertTitle(code: DashboardAlert['code']): string {
  switch (code) {
    case 'missing_log':
      return 'Missing log'
    case 'low_feed':
      return 'Low feed'
    case 'egg_drop':
      return 'Egg drop'
    default: {
      const _exhaustive: never = code
      return _exhaustive
    }
  }
}

export function AlertsPanel({ alerts, farmId }: AlertsPanelProps) {
  if (alerts.length === 0) return null

  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Alerts">
      <Text as="h2" variant="secondary" size="sm">
        Alerts
      </Text>
      <ul className="flex flex-col gap-2">
        {alerts.map((alert, index) => {
          const shedHref =
            alert.shed_id != null
              ? `/farms/${farmId}/sheds/${alert.shed_id}`
              : null
          const farmHref =
            alert.code === 'low_feed' ? `/farms/${farmId}/godown` : null
          const actionHref = shedHref ?? farmHref

          return (
            <li key={`${alert.code}-${alert.shed_id ?? 'farm'}-${index}`}>
              <Banner
                variant="alert"
                size="sm"
                title={alertTitle(alert.code)}
                description={alert.message}
                action={
                  actionHref ? (
                    <Link
                      className="text-sm font-medium text-kumo-default underline"
                      to={actionHref}
                    >
                      {shedHref ? 'Open shed' : 'Open godown'}
                    </Link>
                  ) : null
                }
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
