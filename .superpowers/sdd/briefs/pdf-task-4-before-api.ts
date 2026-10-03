import type {
  AuthUser,
  DailyLog,
  DashboardPayload,
  DashboardRange,
  Farm,
  FarmRates,
  FeedDirection,
  GodownPayload,
  LiveCount,
  Manager,
  Shed,
} from './types'

const API_BASE = 'http://localhost:8010'

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown }
    if (typeof body.detail === 'string' && body.detail) {
      return body.detail
    }
  } catch {
    // Response body is not JSON.
  }
  return `HTTP ${res.status}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return (await res.json()) as T
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  try {
    return await requestJson<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === 'HTTP 401' || err.message === 'Invalid credentials')
    ) {
      throw new Error('Invalid credentials')
    }
    throw err
  }
}

export function logout(): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>('/api/auth/logout', {
    method: 'POST',
  })
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: 'include',
  })
  if (res.status === 401) {
    return null
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return (await res.json()) as AuthUser
}

export function fetchFarms(): Promise<Farm[]> {
  return requestJson<Farm[]>('/api/farms')
}

export function createFarm(input: {
  name: string
  location?: string
}): Promise<Farm> {
  return requestJson<Farm>('/api/farms', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateFarm(
  farmId: string,
  input: { name?: string; location?: string },
): Promise<Farm> {
  return requestJson<Farm>(`/api/farms/${farmId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteFarm(farmId: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>(`/api/farms/${farmId}`, {
    method: 'DELETE',
  })
}

export function fetchSheds(farmId: string): Promise<Shed[]> {
  return requestJson<Shed[]>(`/api/farms/${farmId}/sheds`)
}

export function createShed(
  farmId: string,
  input: { name: string; number?: number; capacity?: number | null },
): Promise<Shed> {
  return requestJson<Shed>(`/api/farms/${farmId}/sheds`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateShed(
  shedId: string,
  input: { name?: string; number?: number; capacity?: number | null },
): Promise<Shed> {
  return requestJson<Shed>(`/api/sheds/${shedId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteShed(shedId: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>(`/api/sheds/${shedId}`, {
    method: 'DELETE',
  })
}

export function fetchManagers(): Promise<Manager[]> {
  return requestJson<Manager[]>('/api/managers')
}

export function createManager(input: {
  email: string
  password: string
  farm_ids: string[]
}): Promise<Manager> {
  return requestJson<Manager>('/api/managers', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateManager(
  managerId: string,
  input: { password?: string; farm_ids?: string[] },
): Promise<Manager> {
  return requestJson<Manager>(`/api/managers/${managerId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteManager(managerId: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>(`/api/managers/${managerId}`, {
    method: 'DELETE',
  })
}

export async function fetchDailyLog(
  shedId: string,
  date: string,
): Promise<DailyLog | null> {
  const res = await fetch(
    `${API_BASE}/api/sheds/${shedId}/daily-logs/${date}`,
    { credentials: 'include' },
  )
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return (await res.json()) as DailyLog
}

export function saveDailyLog(
  shedId: string,
  date: string,
  input: { eggs_collected: number; deaths: number; notes?: string },
): Promise<DailyLog> {
  return requestJson<DailyLog>(`/api/sheds/${shedId}/daily-logs/${date}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function setLiveCount(
  shedId: string,
  input: { live_bird_count: number; reason?: string },
): Promise<LiveCount> {
  return requestJson<LiveCount>(`/api/sheds/${shedId}/live-count`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function fetchGodown(farmId: string): Promise<GodownPayload> {
  return requestJson<GodownPayload>(`/api/farms/${farmId}/godown`)
}

export function createFeedMovement(
  farmId: string,
  input: {
    direction: FeedDirection
    qty_quintal: number
    date: string
    note?: string
  },
): Promise<GodownPayload> {
  return requestJson<GodownPayload>(`/api/farms/${farmId}/godown/movements`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function fetchDashboard(
  farmId: string,
  range: DashboardRange,
): Promise<DashboardPayload> {
  const params = new URLSearchParams({ farm_id: farmId, range })
  return requestJson<DashboardPayload>(`/api/dashboard?${params}`)
}

export async function fetchFarmRates(farmId: string): Promise<FarmRates | null> {
  const res = await fetch(`${API_BASE}/api/farms/${farmId}/rates`, {
    credentials: 'include',
  })
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return (await res.json()) as FarmRates
}

export function saveFarmRates(
  farmId: string,
  input: { egg_price: number; feed_cost_per_kg: number },
): Promise<FarmRates> {
  return requestJson<FarmRates>(`/api/farms/${farmId}/rates`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}
