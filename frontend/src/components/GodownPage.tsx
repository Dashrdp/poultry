import {
  Badge,
  Button,
  Empty,
  Input,
  LayerCard,
  SkeletonLine,
  Text,
} from '@cloudflare/kumo'
import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { createFeedMovement, fetchFarms, fetchGodown } from '../api'
import type { FeedDirection, FeedMovement, GodownPayload } from '../types'

const RECENT_LIMIT = 12

function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function parseQty(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function formatQuintal(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
}

function GodownSkeleton() {
  return (
    <section className="flex flex-col gap-6" aria-busy="true" aria-label="Loading godown">
      <div className="flex flex-col gap-2">
        <SkeletonLine className="h-4 w-28 rounded-md" />
        <SkeletonLine className="h-8 w-40 rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <LayerCard className="flex flex-col gap-3 rounded-lg p-4">
          <SkeletonLine className="h-8 w-full rounded-md" />
          <SkeletonLine className="h-8 w-full rounded-md" />
          <SkeletonLine className="h-8 w-full rounded-md" />
        </LayerCard>
        <LayerCard className="rounded-lg p-4">
          <SkeletonLine className="mb-3 h-4 w-32 rounded-md" />
          <SkeletonLine className="h-40 w-full rounded-md" />
        </LayerCard>
      </div>
    </section>
  )
}

function DirectionBadge({ direction }: { direction: FeedDirection }) {
  switch (direction) {
    case 'in':
      return <Badge variant="green">In</Badge>
    case 'out':
      return <Badge variant="orange">Out</Badge>
    default: {
      const _exhaustive: never = direction
      return _exhaustive
    }
  }
}

function MovementRows({ movements }: { movements: FeedMovement[] }) {
  return (
    <>
      {movements.map((movement) => (
        <div
          key={movement.id}
          className="grid grid-cols-[7rem_4rem_5.5rem_minmax(0,1fr)] items-center gap-3 border-b border-kumo-line px-4 py-2.5 last:border-b-0"
        >
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="tabular-nums">
            {movement.date}
          </Text>
          <DirectionBadge direction={movement.direction} />
          <Text
            as="p"
            size="sm"
            DANGEROUS_className="tabular-nums text-kumo-default"
          >
            {formatQuintal(movement.qty_quintal)} q
          </Text>
          <Text as="p" variant="secondary" size="sm" truncate>
            {movement.note || '—'}
          </Text>
        </div>
      ))}
    </>
  )
}

export function GodownPage() {
  const { farmId = '' } = useParams()
  const [farmName, setFarmName] = useState('')
  const [godown, setGodown] = useState<GodownPayload | null>(null)
  const [date, setDate] = useState(todayIso)
  const [direction, setDirection] = useState<FeedDirection>('in')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([fetchFarms(), fetchGodown(farmId)])
      .then(([farms, payload]) => {
        if (cancelled) return
        const farm = farms.find((item) => item.id === farmId) ?? null
        setFarmName(farm?.name ?? '')
        setGodown(payload)
        setUnavailable(farm === null)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setUnavailable(true)
          setError(err instanceof Error ? err.message : 'Failed to load godown')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [farmId])

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    const qtyQuintal = parseQty(qty)
    if (qtyQuintal === null) {
      setError('Quantity must be a positive number of quintals.')
      return
    }
    setSaving(true)
    setError(null)
    setSaved(null)
    try {
      const payload = await createFeedMovement(farmId, {
        direction,
        qty_quintal: qtyQuintal,
        date,
        note,
      })
      setGodown(payload)
      setQty('')
      setNote('')
      setSaved('Movement saved.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save movement')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <GodownSkeleton />
  }

  if (unavailable || !godown) {
    return (
      <Empty
        size="sm"
        title="Not available"
        description={error ?? 'This farm is not available for godown access.'}
      />
    )
  }

  const recent = godown.movements.slice(0, RECENT_LIMIT)

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text as="p" variant="secondary" size="sm">
            {farmName || 'Farm'}
          </Text>
          <Text as="p" variant="secondary" size="xs" DANGEROUS_className="mt-2">
            Stock on hand
          </Text>
          <Text
            as="p"
            variant="heading"
            size="lg"
            DANGEROUS_className="mt-0.5 tabular-nums"
          >
            {formatQuintal(godown.stock_quintal)} quintal
          </Text>
        </div>
      </div>

      {saved ? (
        <Text as="p" variant="secondary" size="sm" role="status">
          {saved}
        </Text>
      ) : null}
      {error ? (
        <Text
          as="p"
          variant="secondary"
          size="sm"
          DANGEROUS_className="text-kumo-danger"
          role="alert"
        >
          {error}
        </Text>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <LayerCard className="rounded-lg p-4">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => void handleSave(event)}
          >
            <Text as="h2" variant="secondary" size="sm">
              Record movement
            </Text>
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              disabled={saving}
            />
            <div className="flex flex-col gap-2">
              <Text as="p" variant="secondary" size="sm">
                Direction
              </Text>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={direction === 'in' ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={saving}
                  onClick={() => setDirection('in')}
                >
                  In
                </Button>
                <Button
                  type="button"
                  variant={direction === 'out' ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={saving}
                  onClick={() => setDirection('out')}
                >
                  Out
                </Button>
              </div>
            </div>
            <Input
              label="Quantity (quintal)"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              required
              disabled={saving}
            />
            <Input
              label="Note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={saving}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !qty.trim()}
            >
              Save movement
            </Button>
          </form>
        </LayerCard>

        <div className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3">
            <Text as="h2" variant="secondary" size="sm">
              Recent movements
            </Text>
            <Text as="p" variant="secondary" size="xs">
              Latest {recent.length}
              {godown.movements.length > RECENT_LIMIT
                ? ` of ${godown.movements.length}`
                : ''}
            </Text>
          </div>
          {recent.length === 0 ? (
            <Empty
              size="sm"
              title="No movements"
              description="Record feed in or out to start the stock ledger."
            />
          ) : (
            <LayerCard className="overflow-hidden rounded-lg p-0">
              <div className="grid grid-cols-[7rem_4rem_5.5rem_minmax(0,1fr)] gap-3 border-b border-kumo-line bg-kumo-tint px-4 py-2.5">
                <Text as="p" variant="secondary" size="xs">
                  Date
                </Text>
                <Text as="p" variant="secondary" size="xs">
                  Dir
                </Text>
                <Text as="p" variant="secondary" size="xs">
                  Qty
                </Text>
                <Text as="p" variant="secondary" size="xs">
                  Note
                </Text>
              </div>
              <MovementRows movements={recent} />
            </LayerCard>
          )}
        </div>
      </div>
    </section>
  )
}
