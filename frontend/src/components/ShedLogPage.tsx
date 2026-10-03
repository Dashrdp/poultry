import { Button, Empty, Input, LayerCard, SkeletonLine, Text } from '@cloudflare/kumo'
import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { fetchDailyLog, fetchFarms, fetchSheds, saveDailyLog, setLiveCount } from '../api'
import { flockSummary } from '../flock'
import type { Shed } from '../types'
import { PlaceFlockForm } from './PlaceFlockForm'

function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function parseCount(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  return Number(value)
}

function LogSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading shed log">
      <SkeletonLine className="h-6 w-40 rounded-md" />
      <SkeletonLine className="h-10 w-24 rounded-md" />
      <LayerCard className="flex flex-col gap-3 rounded-lg p-4">
        <SkeletonLine className="h-8 w-full rounded-md" />
        <SkeletonLine className="h-8 w-full rounded-md" />
        <SkeletonLine className="h-8 w-full rounded-md" />
      </LayerCard>
    </div>
  )
}

export function ShedLogPage() {
  const { farmId = '', shedId = '' } = useParams()
  const [shed, setShed] = useState<Shed | null>(null)
  const [farmName, setFarmName] = useState('')
  const [date, setDate] = useState(todayIso)
  const [eggs, setEggs] = useState('0')
  const [deaths, setDeaths] = useState('0')
  const [notes, setNotes] = useState('')
  const [liveInput, setLiveInput] = useState('0')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingLog, setSavingLog] = useState(false)
  const [savingLive, setSavingLive] = useState(false)
  const [logReady, setLogReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([fetchFarms(), fetchSheds(farmId)])
      .then(([farms, sheds]) => {
        if (cancelled) return
        const farm = farms.find((item) => item.id === farmId) ?? null
        const selected = sheds.find((item) => item.id === shedId) ?? null
        setFarmName(farm?.name ?? '')
        setShed(selected)
        setUnavailable(farm === null || selected === null)
        if (selected) setLiveInput(String(selected.live_bird_count))
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [farmId, shedId])

  useEffect(() => {
    if (loading || unavailable) return
    let cancelled = false
    setLogReady(false)
    void fetchDailyLog(shedId, date)
      .then((log) => {
        if (cancelled) return
        setEggs(log ? String(log.eggs_collected) : '0')
        setDeaths(log ? String(log.deaths) : '0')
        setNotes(log?.notes ?? '')
        if (log) {
          setShed((current) =>
            current ? { ...current, live_bird_count: log.live_bird_count } : current,
          )
          setLiveInput(String(log.live_bird_count))
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load log')
        }
      })
      .finally(() => {
        if (!cancelled) setLogReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [loading, unavailable, shedId, date])

  async function handleLogSave(event: FormEvent) {
    event.preventDefault()
    if (!shed) return
    const eggsCollected = parseCount(eggs)
    const deathCount = parseCount(deaths)
    if (eggsCollected === null || deathCount === null) {
      setError('Eggs and deaths must be whole numbers.')
      return
    }
    setSavingLog(true)
    setError(null)
    setSaved(null)
    try {
      const log = await saveDailyLog(shed.id, date, {
        eggs_collected: eggsCollected,
        deaths: deathCount,
        notes,
      })
      setShed((current) =>
        current ? { ...current, live_bird_count: log.live_bird_count } : current,
      )
      setLiveInput(String(log.live_bird_count))
      setSaved('Daily log saved.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save log')
    } finally {
      setSavingLog(false)
    }
  }

  async function handleLiveSave(event: FormEvent) {
    event.preventDefault()
    if (!shed) return
    const nextLive = parseCount(liveInput)
    if (nextLive === null) {
      setError('Live count must be a whole number.')
      return
    }
    setSavingLive(true)
    setError(null)
    setSaved(null)
    try {
      const result = await setLiveCount(shed.id, {
        live_bird_count: nextLive,
        reason,
      })
      setShed((current) =>
        current ? { ...current, live_bird_count: result.live_bird_count } : current,
      )
      setSaved('Live count updated.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update live count')
    } finally {
      setSavingLive(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <LogSkeleton />
      </div>
    )
  }

  if (unavailable || !shed) {
    return (
      <Empty
        size="sm"
        title="Not available"
        description="This shed is not on an assigned farm or no longer exists."
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Text as="p" variant="secondary" size="sm">
            {farmName}
          </Text>
          <Text as="h1" variant="heading" size="lg" DANGEROUS_className="mt-1">
            {shed.name}
          </Text>
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
            {shed.flock ? flockSummary(shed.flock) : 'No active flock'}
          </Text>
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-2">
            Live birds
          </Text>
          <Text as="p" variant="heading" size="lg" DANGEROUS_className="tabular-nums">
            {shed.live_bird_count.toLocaleString()}
          </Text>
        </div>
      </div>

      {shed.flock === null ? (
        <PlaceFlockForm
          shed={shed}
          today={todayIso()}
          onPlaced={(flock) => {
            setShed((current) =>
              current ? { ...current, flock, live_bird_count: flock.live_birds } : current,
            )
            setLiveInput(String(flock.live_birds))
            setSaved('Flock placed.')
          }}
        />
      ) : (
        <>
          <LayerCard className="rounded-lg p-4">
            <form className="flex flex-col gap-4" onSubmit={(event) => void handleLogSave(event)}>
              <Text as="h2" variant="secondary" size="sm">
                Today’s log
              </Text>
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                disabled={savingLog}
              />
              <Input
                label="Eggs collected"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={eggs}
                onChange={(event) => setEggs(event.target.value)}
                required
                disabled={savingLog}
              />
              <Input
                label="Deaths"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                description="Subtracts from live birds. Same-day edits replace the earlier count."
                value={deaths}
                onChange={(event) => setDeaths(event.target.value)}
                required
                disabled={savingLog}
              />
              <Input
                label="Notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={savingLog}
              />
              <Button type="submit" variant="primary" disabled={savingLog || !logReady}>
                Save log
              </Button>
            </form>
          </LayerCard>

          <LayerCard className="rounded-lg p-4">
            <form className="flex flex-col gap-4" onSubmit={(event) => void handleLiveSave(event)}>
              <Text as="h2" variant="secondary" size="sm">
                Set live count
              </Text>
              <Text as="p" variant="secondary" size="sm">
                Head-count correction for the active flock. This does not count as mortality.
              </Text>
              <Input
                label="Live birds"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={liveInput}
                onChange={(event) => setLiveInput(event.target.value)}
                required
                disabled={savingLive}
              />
              <Input
                label="Reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={savingLive}
              />
              <Button type="submit" variant="secondary" disabled={savingLive}>
                Update live count
              </Button>
            </form>
          </LayerCard>
        </>
      )}

      {saved ? (
        <Text as="p" variant="secondary" size="sm" role="status">
          {saved}
        </Text>
      ) : null}
      {error ? (
        <Text as="p" variant="secondary" size="sm" DANGEROUS_className="text-kumo-danger" role="alert">
          {error}
        </Text>
      ) : null}
    </div>
  )
}
