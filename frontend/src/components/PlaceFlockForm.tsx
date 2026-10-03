import { Button, Input, LayerCard, Select, Text } from '@cloudflare/kumo'
import { useEffect, useState, type FormEvent } from 'react'
import { fetchBreeds, placeFlock } from '../api'
import type { Breed, Flock, Shed } from '../types'

type PlaceFlockFormProps = {
  shed: Shed
  today: string
  onPlaced: (flock: Flock) => void
}

export function PlaceFlockForm({ shed, today, onPlaced }: PlaceFlockFormProps) {
  const [breeds, setBreeds] = useState<Breed[]>([])
  const [breedId, setBreedId] = useState('')
  const [hatchDate, setHatchDate] = useState('')
  const [placedDate, setPlacedDate] = useState(today)
  const [birds, setBirds] = useState('')
  const [source, setSource] = useState('')
  const [chickCost, setChickCost] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchBreeds()
      .then((rows) => {
        if (cancelled) return
        setBreeds(rows)
        if (rows.length > 0) setBreedId((current) => current || rows[0].id)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load breeds')
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!/^\d+$/.test(birds.trim()) || Number(birds) <= 0) {
      setError('Birds placed must be a whole number above 0.')
      return
    }
    const cost = chickCost.trim() === '' ? null : Number(chickCost)
    if (cost !== null && (Number.isNaN(cost) || cost < 0)) {
      setError('Chick cost must be 0 or more.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const flock = await placeFlock(shed.id, {
        breed_id: breedId,
        hatch_date: hatchDate,
        placed_date: placedDate,
        birds_placed: Number(birds),
        source,
        chick_cost: cost,
      })
      onPlaced(flock)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place flock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <LayerCard className="rounded-lg p-4">
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div>
          <Text as="h2" variant="secondary" size="sm">
            Place flock
          </Text>
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
            No active flock in this shed. Age and stage follow from the hatch date.
          </Text>
        </div>
        <Select
          label="Breed"
          items={breeds.map((breed) => ({ label: breed.name, value: breed.id }))}
          placeholder="Select breed"
          value={breedId || null}
          disabled={saving}
          onValueChange={(next) => {
            if (typeof next === 'string') setBreedId(next)
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Hatch date"
            type="date"
            max={placedDate || today}
            value={hatchDate}
            onChange={(event) => setHatchDate(event.target.value)}
            required
            disabled={saving}
          />
          <Input
            label="Placed date"
            type="date"
            max={today}
            value={placedDate}
            onChange={(event) => setPlacedDate(event.target.value)}
            required
            disabled={saving}
          />
        </div>
        <Input
          label="Birds placed"
          type="number"
          inputMode="numeric"
          min="1"
          max={shed.capacity ?? undefined}
          step="1"
          description={shed.capacity ? `Shed capacity ${shed.capacity.toLocaleString()}` : undefined}
          value={birds}
          onChange={(event) => setBirds(event.target.value)}
          required
          disabled={saving}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Source"
            placeholder="Hatchery"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            disabled={saving}
          />
          <Input
            label="Chick cost (per bird)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={chickCost}
            onChange={(event) => setChickCost(event.target.value)}
            disabled={saving}
          />
        </div>
        <Button type="submit" variant="primary" disabled={saving || !breedId || !hatchDate}>
          Place flock
        </Button>
        {error ? (
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="text-kumo-danger" role="alert">
            {error}
          </Text>
        ) : null}
      </form>
    </LayerCard>
  )
}
