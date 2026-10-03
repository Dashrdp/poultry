import { Button, Empty, LayerCard, SkeletonLine, Text } from '@cloudflare/kumo'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type { ManagerOutletContext } from './ManagerShell'

function FarmsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading farms">
      {Array.from({ length: 2 }, (_, i) => (
        <LayerCard key={i} className="rounded-lg p-4">
          <SkeletonLine className="mb-2 h-5 w-40 rounded-md" />
          <SkeletonLine className="h-4 w-28 rounded-md" />
        </LayerCard>
      ))}
    </div>
  )
}

export function ManagerHome() {
  const navigate = useNavigate()
  const { farms, farmsError, farmsLoading } =
    useOutletContext<ManagerOutletContext>()

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Text as="h1" variant="heading" size="lg">
          Assigned farms
        </Text>
        <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
          Open a farm to log sheds and update godown feed.
        </Text>
      </div>

      {farmsLoading ? (
        <FarmsSkeleton />
      ) : farmsError ? (
        <Empty size="sm" title="Farms unavailable" description={farmsError} />
      ) : farms.length === 0 ? (
        <Empty
          size="sm"
          title="No farms assigned"
          description="Ask an owner to assign a farm to your account."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {farms.map((farm) => (
            <LayerCard
              key={farm.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg p-4"
            >
              <div className="min-w-0">
                <Text as="p" variant="heading" size="lg">
                  {farm.name}
                </Text>
                <Text
                  as="p"
                  variant="secondary"
                  size="sm"
                  DANGEROUS_className="mt-1"
                >
                  {farm.location || 'Location not set'}
                </Text>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/farms/${farm.id}`)}
              >
                Open farm
              </Button>
            </LayerCard>
          ))}
        </div>
      )}
    </section>
  )
}
