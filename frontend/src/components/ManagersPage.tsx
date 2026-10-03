import { Button, Checkbox, Empty, Input, Loader, Text } from '@cloudflare/kumo'
import { Fragment, useEffect, useState, type FormEvent } from 'react'
import {
  createManager,
  deleteManager,
  fetchFarms,
  fetchManagers,
  updateManager,
} from '../api'
import type { Farm, Manager } from '../types'

export function ManagersPage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [farmIds, setFarmIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingFarmIds, setEditingFarmIds] = useState<string[]>([])
  const [editingPassword, setEditingPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchFarms(), fetchManagers()])
      .then(([farmList, managerList]) => {
        if (!cancelled) {
          setFarms(farmList)
          setManagers(managerList)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load managers',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function farmNames(ids: string[]) {
    const names = ids
      .map((id) => farms.find((farm) => farm.id === id)?.name)
      .filter((name): name is string => Boolean(name))
    return names.length > 0 ? names.join(', ') : 'No farms assigned'
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const manager = await createManager({
        email: email.trim(),
        password,
        farm_ids: farmIds,
      })
      setManagers((current) =>
        [...current, manager].sort((a, b) => a.email.localeCompare(b.email)),
      )
      setEmail('')
      setPassword('')
      setFarmIds([])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create manager')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(event: FormEvent, managerId: string) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await updateManager(managerId, {
        farm_ids: editingFarmIds,
        ...(editingPassword ? { password: editingPassword } : {}),
      })
      setManagers((current) =>
        current.map((manager) =>
          manager.id === updated.id ? updated : manager,
        ),
      )
      setEditingId(null)
      setEditingFarmIds([])
      setEditingPassword('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update manager')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(manager: Manager) {
    if (!window.confirm(`Delete manager ${manager.email}?`)) return
    setSaving(true)
    setError(null)
    try {
      await deleteManager(manager.id)
      setManagers((current) =>
        current.filter((item) => item.id !== manager.id),
      )
      if (editingId === manager.id) setEditingId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete manager')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <div className="mb-5">
          <Text as="h2" variant="heading" size="lg">
            Farm managers
          </Text>
          <Text as="p" variant="secondary" size="sm" DANGEROUS_className="mt-1">
            Control manager access by assigning one or more farms.
          </Text>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : managers.length === 0 ? (
          <Empty
            size="sm"
            title="No managers"
            description="Create a manager and assign farm access."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-kumo-line bg-kumo-elevated">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-kumo-line bg-kumo-tint">
                <tr>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">
                    Manager
                  </th>
                  <th className="px-4 py-3 font-medium text-kumo-secondary">
                    Farm access
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-kumo-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {managers.map((manager) => (
                  <Fragment key={manager.id}>
                    <tr className="border-b border-kumo-line last:border-b-0">
                      <td className="px-4 py-3 font-medium text-kumo-default">
                        {manager.email}
                      </td>
                      <td className="max-w-md px-4 py-3 text-kumo-secondary">
                        {farmNames(manager.farm_ids)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={saving}
                            onClick={() => {
                              setEditingId(manager.id)
                              setEditingFarmIds(manager.farm_ids)
                              setEditingPassword('')
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={saving}
                            onClick={() => void handleDelete(manager)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {editingId === manager.id ? (
                      <tr className="border-b border-kumo-line bg-kumo-tint">
                        <td colSpan={3} className="px-4 py-4">
                          <form
                            className="grid gap-5 md:grid-cols-[minmax(0,1fr)_16rem]"
                            onSubmit={(event) =>
                              void handleUpdate(event, manager.id)
                            }
                          >
                            <Checkbox.Group
                              legend="Assigned farms"
                              description="Changes replace current assignments."
                              value={editingFarmIds}
                              onValueChange={setEditingFarmIds}
                              disabled={saving}
                              className="grid gap-2 sm:grid-cols-2"
                            >
                              {farms.map((farm) => (
                                <Checkbox.Item
                                  key={farm.id}
                                  value={farm.id}
                                  label={farm.name}
                                />
                              ))}
                            </Checkbox.Group>
                            <div className="flex flex-col gap-3">
                              <Input
                                label="New password"
                                type="password"
                                autoComplete="new-password"
                                description="Leave blank to keep current password."
                                value={editingPassword}
                                onChange={(event) =>
                                  setEditingPassword(event.target.value)
                                }
                                disabled={saving}
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  variant="primary"
                                  size="sm"
                                  disabled={saving}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={saving}
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="lg:border-l lg:border-kumo-line lg:pl-8">
        <Text as="h2" variant="heading" size="lg">
          Create manager
        </Text>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(event) => void handleCreate(event)}
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={saving}
          />
          <Input
            label="Temporary password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={saving}
          />
          <Checkbox.Group
            legend="Farm access"
            description={
              farms.length === 0
                ? 'Create a farm before assigning access.'
                : 'Assignments can be changed later.'
            }
            value={farmIds}
            onValueChange={setFarmIds}
            disabled={saving || farms.length === 0}
            className="flex flex-col gap-2"
          >
            {farms.map((farm) => (
              <Checkbox.Item
                key={farm.id}
                value={farm.id}
                label={farm.name}
              />
            ))}
          </Checkbox.Group>
          <Button
            type="submit"
            variant="primary"
            disabled={saving || !email.trim() || !password}
          >
            {saving ? 'Saving…' : 'Create manager'}
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
