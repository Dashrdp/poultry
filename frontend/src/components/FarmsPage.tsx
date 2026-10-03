import { Button, Empty, Input, Loader, Text } from '@cloudflare/kumo'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { createFarm, fetchFarms } from '../api'
import type { Farm } from '../types'
import type { OwnerOutletContext } from './OwnerShell'

export function FarmsPage() {
  const navigate = useNavigate()
  const { refreshFarms } = useOutletContext<OwnerOutletContext>()
  const [farms, setFarms] = useState<Farm[]>([])
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchFarms()
      .then((data) => {
        if (!cancelled) {
          setFarms(data)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load farms')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const farm = await createFarm({
        name: name.trim(),
        location: location.trim() || undefined,
      })
      setFarms((current) => [...current, farm])
      await refreshFarms()
      setName('')
      setLocation('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create farm')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <div className="mb-5">
          <Text as="h2" variant="heading" size="lg">
            Farm directory
          </Text>
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
            Open a farm to manage its details and sheds.
          </Text>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : farms.length === 0 ? (
          <Empty
            size="sm"
            title="No farms yet"
            description="Create your first farm using the form."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-kumo-line bg-kumo-elevated">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-kumo-line bg-kumo-tint">
                <tr>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">
                    Farm
                  </th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">
                    Location
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-kumo-secondary">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr
                    key={farm.id}
                    className="border-b border-kumo-line last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-kumo-default">
                      {farm.name}
                    </td>
                    <td className="px-4 py-3 text-kumo-secondary">
                      {farm.location || 'Not set'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/farms/${farm.id}`)}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="lg:border-l lg:border-kumo-line lg:pl-8">
        <Text as="h2" variant="heading" size="lg">
          Create farm
        </Text>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(event) => void handleCreate(event)}
        >
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={submitting}
          />
          <Input
            label="Location"
            description="Optional"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            disabled={submitting}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !name.trim()}
          >
            {submitting ? 'Creating…' : 'Create farm'}
          </Button>
        </form>

        {error ? (
          <Text
            as="p"
            variant="secondary"
            size="sm"
            DANGEROUS_className="mt-4 text-kumo-danger"
            role="alert"
          >
            {error}
          </Text>
        ) : null}
      </aside>
    </section>
  )
}
