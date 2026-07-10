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

export type CoverImage = {
  id: number
  url: string
}

export type Building = {
  id: number
  slug: string
  name: string
  description: string | null
  city: string | null
  state: string | null
  published: boolean
  seo_title: string | null
  seo_description: string | null
  units_count?: number
  units_summary?: UnitsSummary
  cover_image?: CoverImage | null
  towers?: Tower[]
  units?: Unit[]
  tenant?: { id: number; name: string }
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
  reservation?: Reservation | null
}

export type Tenant = {
  id: number
  name: string
  slug: string
  active: boolean
}

export type TenantDetail = Tenant & {
  users_count?: number
}

export type TenantBuilderUser = {
  id: number
  name: string
  email: string
  permissions: string[]
}

export type ImpersonationResponse = {
  redirect_url: string
  expires_in: number
}

export type BrokerInvite = {
  id: number
  name: string
  email: string | null
  phone: string | null
  channel: 'email' | 'whatsapp' | 'link'
  token: string
  status: 'pending' | 'accepted' | 'expired'
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | null
  broker_id: number | null
  accepted_at: string | null
  expires_at: string
  created_at: string
  invite_url: string
}

export type BrokerInvitePreview = {
  name: string
  email: string | null
  requires_email: boolean
  tenant_name: string
  status: string
  expires_at: string
}

export type CreateBrokerInviteInput = {
  name: string
  channel: BrokerInvite['channel']
  email?: string
  phone?: string
}

export type LinkedBroker = {
  id: number
  name: string
  email: string
  accepted_at: string
  buildings_count: number
  buildings: Array<{ id: number; name: string }>
}

export type GrantedBuilding = {
  id: number
  name: string
  granted_at: string | null
}

export type BrokerClient = {
  id: number
  name: string
  phone: string
  email: string | null
}

export type Reservation = {
  id: number
  unit_id: number
  client_id: number
  broker_id: number
  expires_at: string
  created_at?: string
  unit?: Unit
  client?: BrokerClient
  broker?: Pick<LinkedBroker, 'id' | 'name'>
  messages_count?: number
}

export type ReservationMessage = {
  id: number
  body: string
  created_at: string
  author: {
    id: number
    name: string
    role: string
  }
}

export type BuilderReservationListItem = {
  id: number
  created_at: string
  expires_at: string
  messages_count: number
  needs_reply: boolean
  client: Pick<BrokerClient, 'id' | 'name'> | null
  broker: Pick<LinkedBroker, 'id' | 'name'> | null
  unit: {
    id: number
    code: string
    building: Pick<Building, 'id' | 'name'> | null
  } | null
}

export type ReservationPendingRepliesCount = {
  count: number
}

export type Paginated<T> = {
  data: T[]
  current_page: number
  last_page: number
}

export type BuildingMediaCategory = 'internal' | 'external' | 'floor_plan'

export type BuildingMedia = {
  id: number
  building_id: number
  category: BuildingMediaCategory
  original_name: string
  mime_type: string
  size_bytes: number
  published: boolean
  sort_order: number
  url: string
  created_at?: string
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

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, { headers })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.blob()
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

export async function exchangeImpersonationCode(code: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/impersonate/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (!response.ok) {
    throw new Error('Código inválido ou expirado')
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

export async function logout(): Promise<void> {
  try {
    await apiFetch<{ message: string }>('/auth/logout', { method: 'POST' })
  } finally {
    clearToken()
  }
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
  listBuildingMedia: (buildingId: number, category?: BuildingMediaCategory) => {
    const query = category ? `?category=${category}` : ''
    return apiFetch<BuildingMedia[]>(`/builder/buildings/${buildingId}/media${query}`)
  },
  uploadBuildingMedia: (
    buildingId: number,
    file: File,
    category: BuildingMediaCategory,
    published = false,
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    if (published) {
      formData.append('published', '1')
    }

    return apiUpload<BuildingMedia>(`/builder/buildings/${buildingId}/media`, formData)
  },
  updateBuildingMedia: (
    buildingId: number,
    mediaId: number,
    data: { published?: boolean; sort_order?: number },
  ) =>
    apiFetch<BuildingMedia>(`/builder/buildings/${buildingId}/media/${mediaId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteBuildingMedia: (buildingId: number, mediaId: number) =>
    apiFetch<void>(`/builder/buildings/${buildingId}/media/${mediaId}`, {
      method: 'DELETE',
    }),
  fetchBuildingMediaBlob: (buildingId: number, mediaId: number) =>
    fetchAuthenticatedBlob(`/builder/buildings/${buildingId}/media/${mediaId}/file`),
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
  createInvite: (data: CreateBrokerInviteInput) =>
    apiFetch<BrokerInvite>('/builder/invites', {
      method: 'POST',
      body: JSON.stringify(data),
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
  listReservations: () => apiFetch<BuilderReservationListItem[]>('/builder/reservations'),
  pendingRepliesCount: () =>
    apiFetch<ReservationPendingRepliesCount>('/builder/reservations/pending-replies-count'),
  cancelReservation: (reservationId: number) =>
    apiFetch<void>(`/builder/reservations/${reservationId}`, { method: 'DELETE' }),
  listReservationMessages: (reservationId: number) =>
    apiFetch<ReservationMessage[]>(`/builder/reservations/${reservationId}/messages`),
  replyReservation: (reservationId: number, body: string) =>
    apiFetch<ReservationMessage>(`/builder/reservations/${reservationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
}

export const brokerApi = {
  listUnits: () => apiFetch<Unit[]>('/broker/units'),
  listReservations: () => apiFetch<BuilderReservationListItem[]>('/broker/reservations'),
  pendingRepliesCount: () =>
    apiFetch<ReservationPendingRepliesCount>('/broker/reservations/pending-replies-count'),
  listClients: () => apiFetch<BrokerClient[]>('/broker/clients'),
  createClient: (data: { name: string; phone: string; email?: string }) =>
    apiFetch<BrokerClient>('/broker/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createReservation: (unitId: number, clientId: number, observations?: string) =>
    apiFetch<Reservation>('/broker/reservations', {
      method: 'POST',
      body: JSON.stringify({
        unit_id: unitId,
        client_id: clientId,
        observations: observations?.trim() || undefined,
      }),
    }),
  cancelReservation: (reservationId: number) =>
    apiFetch<void>(`/broker/reservations/${reservationId}`, { method: 'DELETE' }),
  listReservationMessages: (reservationId: number) =>
    apiFetch<ReservationMessage[]>(`/broker/reservations/${reservationId}/messages`),
  replyReservation: (reservationId: number, body: string) =>
    apiFetch<ReservationMessage>(`/broker/reservations/${reservationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  previewInvite: (token: string) =>
    apiFetch<BrokerInvitePreview>(
      `/broker/invites/preview?token=${encodeURIComponent(token)}`,
      {},
      false,
    ),
  acceptInvite: (data: { token: string; name?: string; email?: string; password?: string }) =>
    apiFetch<LoginResponse>('/broker/invites/accept', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),
  fetchBuildingMediaBlob: (buildingId: number, mediaId: number) =>
    fetchAuthenticatedBlob(`/broker/buildings/${buildingId}/media/${mediaId}/file`),
}

export type PublicCheapestUnit = {
  code: string
  price: string
  area_m2: string | null
  floor: number | null
}

export type PublicCoverImage = CoverImage

export type PublicBuildingListItem = Pick<
  Building,
  'id' | 'slug' | 'name' | 'description' | 'city' | 'state' | 'seo_title' | 'seo_description' | 'units_count'
> & {
  cheapest_unit: PublicCheapestUnit | null
  cover_image: PublicCoverImage | null
}

export function publicMediaUrl(relativeUrl: string): string {
  const base = API_URL.replace(/\/$/, '')
  const path = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`

  return `${base}${path}`
}

export const adminApi = {
  listTenants: () => apiFetch<Paginated<Tenant>>('/admin/tenants'),
  getTenant: (id: number) => apiFetch<TenantDetail>(`/admin/tenants/${id}`),
  createTenant: (data: Partial<Tenant>) =>
    apiFetch<Tenant>('/admin/tenants', { method: 'POST', body: JSON.stringify(data) }),
  updateTenant: (id: number, data: Partial<Tenant>) =>
    apiFetch<Tenant>(`/admin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  listTenantUsers: (tenantId: number) =>
    apiFetch<TenantBuilderUser[]>(`/admin/tenants/${tenantId}/users`),
  impersonateTenant: (tenantId: number, userId: number) =>
    apiFetch<ImpersonationResponse>(`/admin/tenants/${tenantId}/impersonate`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
}

export const publicApi = {
  listBuildings: () => apiFetch<PublicBuildingListItem[]>('/public/buildings', {}, false),
  getBuilding: (slug: string) =>
    apiFetch<Building & { units?: Unit[] }>(`/public/buildings/${slug}`, {}, false),
}
