const API_URL = import.meta.env.VITE_API_URL ?? 'http://api.localhost:8000/api'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: string
  tenant_id: number | null
  permissions?: string[]
}

export type TeamMember = {
  id: number
  name: string
  email: string
  permissions: string[]
  created_at?: string
}

export type LoginResponse = {
  token: string
  user: AuthUser
}

export type UnitsSummary = {
  total: number
  available: number
  pre_reserved: number
  reserved: number
  sold: number
  unavailable: number
}

export type Tower = {
  id: number
  name: string
  sort_order: number
  building_id?: number
  units_summary?: UnitsSummary
  units?: Unit[]
}

export type Building = {
  id: number
  name: string
  description: string | null
  city: string | null
  state: string | null
  published: boolean
  seo_title: string | null
  seo_description: string | null
  units_count?: number
  units_summary?: UnitsSummary
  towers?: Tower[]
  units?: Unit[]
}

export type Unit = {
  id: number
  code: string
  floor: number | null
  area_m2: string | null
  price: string | null
  status: string
  tower_id?: number
  tower?: Pick<Tower, 'id' | 'name'>
  building?: Building
}

export type Tenant = {
  id: number
  name: string
  slug: string
  active: boolean
}

export type BrokerInvite = {
  id: number
  email: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  broker_id: number | null
  accepted_at: string | null
  expires_at: string
  created_at: string
  invite_url: string
}

export type BrokerInvitePreview = {
  email: string
  tenant_name: string
  status: string
  expires_at: string
}

export type LinkedBroker = {
  id: number
  name: string
  email: string
  accepted_at: string
}

export type GrantedBuilding = {
  id: number
  name: string
  granted_at: string | null
}

export type Paginated<T> = {
  data: T[]
  current_page: number
  last_page: number
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Credenciais inválidas')
  }

  return response.json() as Promise<LoginResponse>
}

export function saveToken(token: string): void {
  localStorage.setItem('opim_token', token)
}

export function getToken(): string | null {
  return localStorage.getItem('opim_token')
}

export function clearToken(): void {
  localStorage.removeItem('opim_token')
}

export async function fetchMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me')
}

export const builderApi = {
  listBuildings: () => apiFetch<Building[]>('/builder/buildings'),
  getBuilding: (id: number) => apiFetch<Building>(`/builder/buildings/${id}`),
  createBuilding: (data: Partial<Building>) =>
    apiFetch<Building>('/builder/buildings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBuilding: (id: number, data: Partial<Building>) =>
    apiFetch<Building>(`/builder/buildings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  createTower: (buildingId: number, data: Partial<Tower>) =>
    apiFetch<Tower>(`/builder/buildings/${buildingId}/towers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTower: (buildingId: number, towerId: number, data: Partial<Tower>) =>
    apiFetch<Tower>(`/builder/buildings/${buildingId}/towers/${towerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  listUnits: (buildingId: number) =>
    apiFetch<Unit[]>(`/builder/buildings/${buildingId}/units`),
  createUnit: (buildingId: number, data: Partial<Unit>) =>
    apiFetch<Unit>(`/builder/buildings/${buildingId}/units`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUnit: (buildingId: number, unitId: number, data: Partial<Unit>) =>
    apiFetch<Unit>(`/builder/buildings/${buildingId}/units/${unitId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  listInvites: () => apiFetch<BrokerInvite[]>('/builder/invites'),
  createInvite: (email: string) =>
    apiFetch<BrokerInvite>('/builder/invites', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resendInvite: (id: number) =>
    apiFetch<BrokerInvite>(`/builder/invites/${id}/resend`, { method: 'POST' }),
  cancelInvite: (id: number) =>
    apiFetch<void>(`/builder/invites/${id}`, { method: 'DELETE' }),
  listBrokers: () => apiFetch<LinkedBroker[]>('/builder/brokers'),
  listBrokerBuildings: (brokerId: number) =>
    apiFetch<GrantedBuilding[]>(`/builder/brokers/${brokerId}/buildings`),
  grantBuildingAccess: (brokerId: number, buildingId: number) =>
    apiFetch(`/builder/brokers/${brokerId}/buildings`, {
      method: 'POST',
      body: JSON.stringify({ building_id: buildingId }),
    }),
  revokeBuildingAccess: (brokerId: number, buildingId: number) =>
    apiFetch<void>(`/builder/brokers/${brokerId}/buildings/${buildingId}`, {
      method: 'DELETE',
    }),
  listTeam: () => apiFetch<TeamMember[]>('/builder/team'),
  createTeamMember: (data: {
    name: string
    email: string
    password: string
    permissions: string[]
  }) =>
    apiFetch<TeamMember>('/builder/team', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTeamMember: (
    id: number,
    data: { name?: string; password?: string; permissions?: string[] },
  ) =>
    apiFetch<TeamMember>(`/builder/team/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteTeamMember: (id: number) =>
    apiFetch<void>(`/builder/team/${id}`, { method: 'DELETE' }),
}

export const brokerApi = {
  listUnits: () => apiFetch<Unit[]>('/broker/units'),
  createReservation: (unitId: number) =>
    apiFetch('/broker/reservations', {
      method: 'POST',
      body: JSON.stringify({ unit_id: unitId }),
    }),
  previewInvite: (token: string) =>
    apiFetch<BrokerInvitePreview>(
      `/broker/invites/preview?token=${encodeURIComponent(token)}`,
      {},
      false,
    ),
  acceptInvite: (data: { token: string; name?: string; password?: string }) =>
    apiFetch<LoginResponse>('/broker/invites/accept', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),
}

export const adminApi = {
  listTenants: () => apiFetch<Paginated<Tenant>>('/admin/tenants'),
  createTenant: (data: Partial<Tenant>) =>
    apiFetch<Tenant>('/admin/tenants', { method: 'POST', body: JSON.stringify(data) }),
  updateTenant: (id: number, data: Partial<Tenant>) =>
    apiFetch<Tenant>(`/admin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const publicApi = {
  listBuildings: () => apiFetch<Building[]>('/public/buildings', {}, false),
  getBuilding: (id: number) =>
    apiFetch<Building & { units?: Unit[] }>(`/public/buildings/${id}`, {}, false),
}
