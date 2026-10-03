import { Button, Empty, Input, Loader, Text } from '@cloudflare/kumo'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  createShed,
  deleteFarm,
  deleteShed,
  fetchFarmRates,
  fetchFarms,
  fetchSheds,
  saveFarmRates,
  updateFarm,
  updateShed,
} from '../api'
import { useAuth } from '../auth'
import { flockStageLabel } from '../flock'
import type { Farm, Shed } from '../types'
import type { OwnerOutletContext } from './OwnerShell'

type ShedDraft = {
  name: string
  number: string
  capacity: string
}

function shedDraft(shed: Shed): ShedDraft {
  return {
    name: shed.name,
    number: String(shed.number),
    capacity: shed.capacity === null ? '' : String(shed.capacity),
  }
}

export function FarmDetailPage() {
  const { farmId = '' } = useParams()
  const { user } = useAuth()
  const ownerContext = useOutletContext<OwnerOutletContext | null>()
  const navigate = useNavigate()
  const isOwner = user?.role === 'owner'
  const [farm, setFarm] = useState<Farm | null>(null)
  const [sheds, setSheds] = useState<Shed[]>([])
  const [farmName, setFarmName] = useState('')
  const [farmLocation, setFarmLocation] = useState('')
  const [newShedName, setNewShedName] = useState('')
  const [newShedNumber, setNewShedNumber] = useState('')
  const [newShedCapacity, setNewShedCapacity] = useState('')
  const [editingShedId, setEditingShedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ShedDraft | null>(null)
  const [eggPrice, setEggPrice] = useState('')
  const [feedCostPerKg, setFeedCostPerKg] = useState('')
  const [ratesSaved, setRatesSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([fetchFarms(), fetchSheds(farmId), fetchFarmRates(farmId)])
      .then(([farms, shedList, rates]) => {
        if (cancelled) return
        const selectedFarm = farms.find((item) => item.id === farmId) ?? null
        setFarm(selectedFarm)
        setFarmName(selectedFarm?.name ?? '')
        setFarmLocation(selectedFarm?.location ?? '')
        setSheds(shedList)
        setEggPrice(rates ? String(rates.egg_price) : '')
        setFeedCostPerKg(rates ? String(rates.feed_cost_per_kg) : '')
        setRatesSaved(false)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load farm')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [farmId])

  async function handleFarmSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await updateFarm(farmId, {
        name: farmName.trim(),
        location: farmLocation.trim(),
      })
      setFarm(updated)
      await ownerContext?.refreshFarms()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update farm')
    } finally {
      setSaving(false)
    }
  }

  async function handleRatesSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setRatesSaved(false)
    try {
      const saved = await saveFarmRates(farmId, {
        egg_price: Number(eggPrice),
        feed_cost_per_kg: Number(feedCostPerKg),
      })
      setEggPrice(String(saved.egg_price))
      setFeedCostPerKg(String(saved.feed_cost_per_kg))
      setRatesSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save rates')
    } finally {
      setSaving(false)
    }
  }

  async function handleFarmDelete() {
    if (!farm || !window.confirm(`Delete ${farm.name} and all its sheds?`)) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await deleteFarm(farm.id)
      await ownerContext?.refreshFarms()
      navigate('/farms')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete farm')
      setSaving(false)
    }
  }

  async function handleShedCreate(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const created = await createShed(farmId, {
        name: newShedName.trim(),
        number: newShedNumber ? Number(newShedNumber) : undefined,
        capacity: newShedCapacity ? Number(newShedCapacity) : undefined,
      })
      setSheds((current) =>
        [...current, created].sort((a, b) => a.number - b.number),
      )
      setNewShedName('')
      setNewShedNumber('')
      setNewShedCapacity('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create shed')
    } finally {
      setSaving(false)
    }
  }

  async function handleShedSave(shedId: string) {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateShed(shedId, {
        name: draft.name.trim(),
        number: Number(draft.number),
        capacity: draft.capacity ? Number(draft.capacity) : null,
      })
      setSheds((current) =>
        current
          .map((shed) => (shed.id === updated.id ? updated : shed))
          .sort((a, b) => a.number - b.number),
      )
      setEditingShedId(null)
      setDraft(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update shed')
    } finally {
      setSaving(false)
    }
  }

  async function handleShedDelete(shed: Shed) {
    if (!window.confirm(`Delete ${shed.name}?`)) return
    setSaving(true)
    setError(null)
    try {
      await deleteShed(shed.id)
      setSheds((current) => current.filter((item) => item.id !== shed.id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete shed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    )
  }

  if (!farm) {
    return (
      <Empty
        size="sm"
        title="Farm not found"
        description={error ?? 'This farm is unavailable.'}
      />
    )
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-kumo-line pb-6">
        <div>
          <Text as="h2" variant="heading" size="lg">
            {farm.name}
          </Text>
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
            {farm.location || 'Location not set'}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/farms/${farmId}/godown`)}
          >
            Godown
          </Button>
        </div>
      </div>

      {isOwner ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => void handleFarmSave(event)}
          >
            <div className="sm:col-span-2">
              <Text as="h3" variant="heading" size="lg">
                Farm details
              </Text>
            </div>
            <Input
              label="Name"
              value={farmName}
              onChange={(event) => setFarmName(event.target.value)}
              required
              disabled={saving}
            />
            <Input
              label="Location"
              value={farmLocation}
              onChange={(event) => setFarmLocation(event.target.value)}
              disabled={saving}
            />
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button
                type="submit"
                variant="primary"
                disabled={saving || !farmName.trim()}
              >
                Save details
              </Button>
              <Button
                type="button"
                variant="secondary-destructive"
                disabled={saving}
                onClick={() => void handleFarmDelete()}
              >
                Delete farm
              </Button>
            </div>
          </form>

          <form
            className="flex flex-col gap-4 lg:border-l lg:border-kumo-line lg:pl-8"
            onSubmit={(event) => void handleShedCreate(event)}
          >
            <Text as="h3" variant="heading" size="lg">
              Add shed
            </Text>
            <Input
              label="Name"
              value={newShedName}
              onChange={(event) => setNewShedName(event.target.value)}
              required
              disabled={saving}
            />
            <Input
              label="Number"
              type="number"
              min="1"
              description="Optional. Next number used when blank."
              value={newShedNumber}
              onChange={(event) => setNewShedNumber(event.target.value)}
              disabled={saving}
            />
            <Input
              label="Capacity"
              type="number"
              min="0"
              description="Optional"
              value={newShedCapacity}
              onChange={(event) => setNewShedCapacity(event.target.value)}
              disabled={saving}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !newShedName.trim()}
            >
              Add shed
            </Button>
          </form>
        </div>
      ) : null}

      {isOwner ? (
        <form
          className="grid max-w-xl gap-4 sm:grid-cols-2"
          onSubmit={(event) => void handleRatesSave(event)}
        >
          <div className="sm:col-span-2">
            <Text as="h3" variant="heading" size="lg">
              Rates
            </Text>
            <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
              Manual egg price and feed cost for rough margin on the dashboard.
            </Text>
          </div>
          <Input
            label="Egg price"
            type="number"
            min="0"
            step="0.01"
            description="Per egg"
            value={eggPrice}
            onChange={(event) => {
              setEggPrice(event.target.value)
              setRatesSaved(false)
            }}
            required
            disabled={saving}
          />
          <Input
            label="Feed cost"
            type="number"
            min="0"
            step="0.01"
            description="Per kg"
            value={feedCostPerKg}
            onChange={(event) => {
              setFeedCostPerKg(event.target.value)
              setRatesSaved(false)
            }}
            required
            disabled={saving}
          />
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button
              type="submit"
              variant="primary"
              disabled={
                saving || eggPrice.trim() === '' || feedCostPerKg.trim() === ''
              }
            >
              Save rates
            </Button>
            {ratesSaved ? (
              <Text as="p" variant="secondary" size="sm">
                Rates saved
              </Text>
            ) : null}
          </div>
        </form>
      ) : null}

      <div>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <Text as="h3" variant="heading" size="lg">
              Sheds
            </Text>
            <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
              {isOwner ? 'Manage shed identity and capacity.' : 'Read-only shed overview.'}
            </Text>
          </div>
          <Text as="p" variant="secondary" size="sm">
            {sheds.length} total
          </Text>
        </div>

        {sheds.length === 0 ? (
          <Empty
            size="sm"
            title="No sheds"
            description={
              isOwner
                ? 'Add the first shed using the form above.'
                : 'No sheds are configured for this farm.'
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-kumo-line bg-kumo-elevated">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="border-b border-kumo-line bg-kumo-tint">
                <tr>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Number</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Name</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Flock</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Live birds</th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">Capacity</th>
                  {isOwner ? (
                    <th className="px-4 py-3 text-right font-medium text-kumo-secondary">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {sheds.map((shed) => {
                  const isEditing = editingShedId === shed.id && draft
                  return (
                    <tr key={shed.id} className="border-b border-kumo-line last:border-b-0">
                      <td className="px-4 py-3 text-kumo-default">
                        {isEditing ? (
                          <Input
                            aria-label={`${shed.name} number`}
                            type="number"
                            min="1"
                            size="sm"
                            value={draft.number}
                            onChange={(event) => setDraft({ ...draft, number: event.target.value })}
                          />
                        ) : shed.number}
                      </td>
                      <td className="px-4 py-3 font-medium text-kumo-default">
                        {isEditing ? (
                          <Input
                            aria-label={`${shed.name} name`}
                            size="sm"
                            value={draft.name}
                            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                          />
                        ) : shed.name}
                      </td>
                      <td className="px-4 py-3 text-kumo-secondary">
                        {shed.flock
                          ? `Wk ${shed.flock.age_week} · ${flockStageLabel(shed.flock.stage)}`
                          : 'No flock'}
                      </td>
                      <td className="px-4 py-3 text-kumo-secondary">{shed.live_bird_count}</td>
                      <td className="px-4 py-3 text-kumo-secondary">
                        {isEditing ? (
                          <Input
                            aria-label={`${shed.name} capacity`}
                            type="number"
                            min="0"
                            size="sm"
                            value={draft.capacity}
                            onChange={(event) => setDraft({ ...draft, capacity: event.target.value })}
                          />
                        ) : shed.capacity ?? 'Not set'}
                      </td>
                      {isOwner ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  disabled={saving || !draft.name.trim() || !draft.number}
                                  onClick={() => void handleShedSave(shed.id)}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingShedId(null)
                                    setDraft(null)
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={saving}
                                  onClick={() => navigate(`/farms/${farmId}/sheds/${shed.id}`)}
                                >
                                  Log
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={saving}
                                  onClick={() => {
                                    setEditingShedId(shed.id)
                                    setDraft(shedDraft(shed))
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary-destructive"
                                  size="sm"
                                  disabled={saving}
                                  onClick={() => void handleShedDelete(shed)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </section>
  )
}
