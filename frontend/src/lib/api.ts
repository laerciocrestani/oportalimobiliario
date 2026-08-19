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

export type Amenity = {
  id: number
  slug: string
  name: string
  active: boolean
}

export type ContractCustomVariable = {
  slug: string
  label: string
}

export type ContractTemplate = {
  id: number
  name: string
  body_markdown: string
  custom_variables: ContractCustomVariable[]
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type ContractSystemVariable = {
  slug: string
  label: string
  group: string
}

export type ContractIssuePreview = {
  template: { id: number; name: string }
  system_values: Record<string, string>
  custom_variables: ContractCustomVariable[]
  unknown_placeholders: string[]
  required_custom_slugs: string[]
  suggested_price: string | number | null
}

export type ContractIssueResult = {
  status: string
  frozen_price_brl: string | number | null
  attachment: {
    id: number
    kind: string
    original_name: string
    file_url: string
  }
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

export type FloorKind = 'residential' | 'commercial'

export type Floor = {
  id: number
  tower_id: number
  number: number
  kind: FloorKind
}

export type Tower = {
  id: number
  name: string
  sort_order: number
  building_id?: number
  floors_count?: number
  floors?: Floor[]
  units_summary?: UnitsSummary
  units?: Unit[]
}

export type BuildingStructurePayload = {
  towers: Array<{ name: string; floors_count: number }>
}

export type BuildingUnitGridPayload = {
  towers: Array<{
    id: number
    floors: Array<{
      number: number
      kind: FloorKind
      units: Array<{ code: string; area_m2?: number | null }>
    }>
  }>
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
  zip?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city: string | null
  state: string | null
  published: boolean
  wizard_step?: number
  wizard_completed_at?: string | null
  seo_title: string | null
  seo_description: string | null
  units_count?: number
  units_summary?: UnitsSummary
  cover_image?: CoverImage | null
  towers?: Tower[]
  units?: Unit[]
  tenant?: { id: number; name: string }
}

export type CepAddress = {
  zip: string
  street: string
  neighborhood: string
  city: string
  state: string
  complement: string
}

export type UnitPreHold = {
  reservation_id: number
  expires_at: string
  held_by_me: boolean
}

export type Unit = {
  id: number
  code: string
  floor: number | null
  floor_id?: number | null
  area_m2: string | null
  price: string | null
  status: string
  tower_id?: number
  tower?: Pick<Tower, 'id' | 'name'>
  building?: Building
  reservation?: Reservation | null
  pre_hold?: UnitPreHold | null
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
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | null
  broker_id: number | null
  accepted_at: string | null
  declined_at: string | null
  expires_at: string
  last_sent_at: string
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
  channel: 'email' | 'whatsapp'
  email?: string
  phone?: string
}

export type TenantInviteLink = {
  token: string
  invite_url: string
  regenerated_at: string | null
  created_at: string
}

export type PendingBroker = {
  id: number
  broker_id: number
  name: string
  email: string | null
  phone: string | null
  requested_at: string
}

export type BrokerJoinPreview = {
  tenant_name: string
  type: 'open'
}

export type BrokerProfile = {
  role: 'broker'
  tenant_context: boolean
  access_status: 'active' | 'pending_only' | 'restricted'
  pending_approvals: Array<{
    tenant_id: number
    tenant_name: string
    requested_at: string
  }>
  inactive_tenants: Array<{
    tenant_id: number
    tenant_name: string
    revoked_at: string | null
  }>
  has_approved_access: boolean
}

export type LinkedBroker = {
  id: number
  name: string
  email: string | null
  phone: string | null
  status: 'active' | 'inactive'
  accepted_at: string
  revoked_at: string | null
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
  client_id: number | null
  broker_id: number
  status?: string
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

export type ReservationSituationStep = {
  key: string
  label: string
  occurred_at: string | null
}

export type ReservationWaitingOn = 'broker' | 'builder'

export type ReservationSituation = {
  previous: ReservationSituationStep | null
  current: ReservationSituationStep & {
    status: 'current' | 'failed' | 'completed'
    waiting_on: ReservationWaitingOn | null
  }
  next: ReservationSituationStep | null
}

export type BuilderReservationListItem = {
  id: number
  status: string
  created_at: string
  expires_at: string
  messages_count: number
  needs_reply: boolean
  needs_proposal_decision: boolean
  needs_deposit_proof_approval: boolean
  deposit_overdue: boolean
  situation: ReservationSituation
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

export type ReservationTimelineStepStatus =
  | 'completed'
  | 'current'
  | 'upcoming'
  | 'skipped'
  | 'failed'

export type ReservationTimelineStep = {
  key: string
  label: string
  status: ReservationTimelineStepStatus
  occurred_at: string | null
  due_at: string | null
  actor: { id: number; name: string; role: string } | null
  actions: string[]
}

export type ReservationAttachment = {
  id: number
  kind: string
  original_name: string
  mime_type: string
  size_bytes: number
  uploaded_by: number
  created_at: string | null
  file_url: string
}

export type ReservationTimelineClient = {
  id: number
  name: string
  phone: string
  email: string | null
}

export type ReservationTimeline = {
  reservation_id: number
  current_stage: string
  expires_at: string | null
  deposit_overdue: boolean
  unit: {
    id: number
    code: string
    status: string
  }
  client: ReservationTimelineClient | null
  current_proposal: ReservationProposal | null
  current_deposit_proof: ReservationAttachment | null
  attachments: ReservationAttachment[]
  steps: ReservationTimelineStep[]
}

export type ReservationContractDataInput = {
  client_name: string
  client_phone: string
  client_email: string
  client_cpf: string
  client_rg: string
  address: string
  city: string
  state: string
  zip: string
  marital_status: string
  nationality: string
  spouse_name: string
  spouse_phone: string
  spouse_email: string
  spouse_cpf: string
  spouse_rg: string
  spouse_nationality: string
}

export type ReservationProposalInput = {
  client_name: string
  client_email: string
  client_phone: string
  client_cpf: string
  address: string
  city: string
  state: string
  zip: string
  marital_status: string
  nationality: string
  land_value: number
  payment_terms: string
}

export type ReservationProposal = ReservationProposalInput & {
  id: number
  version: number
  decision: 'accepted' | 'rejected' | 'returned' | null
  decision_note: string | null
  submitted_by: number
  decided_by: number | null
  decided_at: string | null
  created_at: string | null
  client_rg?: string | null
  spouse_name?: string | null
  spouse_phone?: string | null
  spouse_email?: string | null
  spouse_cpf?: string | null
  spouse_rg?: string | null
  spouse_nationality?: string | null
}

export type ProposalDecision = 'accepted' | 'rejected' | 'returned'

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

export class ApiRequestError extends Error {
  status: number

  errors?: Record<string, string[]>

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.errors = errors
  }
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
    const body = (await response.json().catch(() => null)) as
      | { message?: string; errors?: Record<string, string[]> }
      | null

    throw new ApiRequestError(
      body?.message ?? `API error: ${response.status}`,
      response.status,
      body?.errors,
    )
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
  lookupCep: (cep: string) => apiFetch<CepAddress>(`/builder/cep/${cep}`),
  listAmenities: () => apiFetch<Amenity[]>('/builder/amenities'),
  updateBuilding: (id: number, data: Partial<Building>) =>
    apiFetch<Building>(`/builder/buildings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  replaceBuildingStructure: (id: number, data: BuildingStructurePayload) =>
    apiFetch<Building>(`/builder/buildings/${id}/structure`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  replaceBuildingUnitGrid: (id: number, data: BuildingUnitGridPayload) =>
    apiFetch<Building>(`/builder/buildings/${id}/unit-grid`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  generateBuildingDescription: (id: number) =>
    apiFetch<{ description: string }>(`/builder/buildings/${id}/generate-description`, {
      method: 'POST',
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
  revokeInvite: (id: number) =>
    apiFetch<BrokerInvite>(`/builder/invites/${id}/revoke`, { method: 'POST' }),
  reactivateInvite: (id: number) =>
    apiFetch<BrokerInvite>(`/builder/invites/${id}/reactivate`, { method: 'POST' }),
  cancelInvite: (id: number) =>
    apiFetch<BrokerInvite>(`/builder/invites/${id}`, { method: 'DELETE' }),
  getInviteLink: () => apiFetch<TenantInviteLink>('/builder/invite-link'),
  regenerateInviteLink: () =>
    apiFetch<TenantInviteLink>('/builder/invite-link/regenerate', { method: 'POST' }),
  listPendingBrokers: () => apiFetch<PendingBroker[]>('/builder/pending-brokers'),
  approvePendingBroker: (id: number) =>
    apiFetch<{ id: number; approved_at: string }>(`/builder/pending-brokers/${id}/approve`, {
      method: 'POST',
    }),
  rejectPendingBroker: (id: number) =>
    apiFetch<void>(`/builder/pending-brokers/${id}/reject`, { method: 'POST' }),
  listBrokers: () => apiFetch<LinkedBroker[]>('/builder/brokers'),
  deactivateBroker: (id: number) =>
    apiFetch<{ id: number; status: 'inactive'; revoked_at: string }>(
      `/builder/brokers/${id}/deactivate`,
      { method: 'POST' },
    ),
  reactivateBroker: (id: number) =>
    apiFetch<{ id: number; status: 'active'; revoked_at: null }>(
      `/builder/brokers/${id}/reactivate`,
      { method: 'POST' },
    ),
  removeBroker: (id: number) =>
    apiFetch<void>(`/builder/brokers/${id}`, { method: 'DELETE' }),
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
  cancelReservation: (reservationId: number, reason: string) =>
    apiFetch<void>(`/builder/reservations/${reservationId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason: reason.trim() }),
    }),
  listReservationMessages: (reservationId: number) =>
    apiFetch<ReservationMessage[]>(`/builder/reservations/${reservationId}/messages`),
  replyReservation: (reservationId: number, body: string) =>
    apiFetch<ReservationMessage>(`/builder/reservations/${reservationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  getReservationTimeline: (reservationId: number) =>
    apiFetch<ReservationTimeline>(`/builder/reservations/${reservationId}/timeline`),
  decideReservationProposal: (
    reservationId: number,
    decision: ProposalDecision,
    decisionNote?: string,
  ) =>
    apiFetch<{ status: string; proposal: ReservationProposal }>(
      `/builder/reservations/${reservationId}/proposal/decision`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          decision_note: decisionNote?.trim() || undefined,
        }),
      },
    ),
  approveDepositProof: (reservationId: number) =>
    apiFetch<{ status: string }>(
      `/builder/reservations/${reservationId}/deposit-proof/approve`,
      { method: 'PATCH' },
    ),
  listContractVariables: () => apiFetch<ContractSystemVariable[]>('/builder/contract-variables'),
  listContractTemplates: () => apiFetch<ContractTemplate[]>('/builder/contract-templates'),
  createContractTemplate: (data: {
    name: string
    body_markdown: string
    custom_variables?: ContractCustomVariable[]
    is_active?: boolean
  }) =>
    apiFetch<ContractTemplate>('/builder/contract-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateContractTemplate: (
    id: number,
    data: Partial<{
      name: string
      body_markdown: string
      custom_variables: ContractCustomVariable[]
      is_active: boolean
    }>,
  ) =>
    apiFetch<ContractTemplate>(`/builder/contract-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteContractTemplate: (id: number) =>
    apiFetch<void>(`/builder/contract-templates/${id}`, { method: 'DELETE' }),
  listIssueContractTemplates: (reservationId: number) =>
    apiFetch<Array<{ id: number; name: string }>>(
      `/builder/reservations/${reservationId}/contract/templates`,
    ),
  previewContractIssue: (reservationId: number, templateId: number) =>
    apiFetch<ContractIssuePreview>(
      `/builder/reservations/${reservationId}/contract/preview?template_id=${templateId}`,
    ),
  issueContract: (
    reservationId: number,
    data: {
      contract_template_id: number
      values: Record<string, string>
      final_price_brl: number
    },
  ) =>
    apiFetch<ContractIssueResult>(`/builder/reservations/${reservationId}/contract/issue`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const brokerApi = {
  getProfile: () => apiFetch<BrokerProfile>('/broker/profile'),
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
  createPreHold: (unitId: number) =>
    apiFetch<Reservation>('/broker/reservations/pre-hold', {
      method: 'POST',
      body: JSON.stringify({ unit_id: unitId }),
    }),
  confirmReservation: (reservationId: number, data: ReservationProposalInput) =>
    apiFetch<Reservation>(`/broker/reservations/${reservationId}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  submitReservationProposal: (reservationId: number, data: ReservationProposalInput) =>
    apiFetch<Reservation & { proposal?: ReservationProposal }>(
      `/broker/reservations/${reservationId}/proposal`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),
  uploadDepositProof: (reservationId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return apiUpload<{ status: string; attachment: ReservationAttachment }>(
      `/broker/reservations/${reservationId}/deposit-proof`,
      formData,
    )
  },
  submitContractData: (
    reservationId: number,
    data: ReservationContractDataInput,
    files: File[],
  ) => {
    const formData = new FormData()

    for (const [key, value] of Object.entries(data)) {
      formData.append(key, value)
    }

    for (const file of files) {
      formData.append('files[]', file)
    }

    return apiUpload<{ status: string; attachments: ReservationAttachment[] }>(
      `/broker/reservations/${reservationId}/contract-data`,
      formData,
    )
  },
  releasePreHold: (reservationId: number) =>
    apiFetch<void>(`/broker/reservations/${reservationId}/pre-hold`, { method: 'DELETE' }),
  cancelReservation: (reservationId: number, reason: string) =>
    apiFetch<void>(`/broker/reservations/${reservationId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason: reason.trim() }),
    }),
  listReservationMessages: (reservationId: number) =>
    apiFetch<ReservationMessage[]>(`/broker/reservations/${reservationId}/messages`),
  replyReservation: (reservationId: number, body: string) =>
    apiFetch<ReservationMessage>(`/broker/reservations/${reservationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  getReservationTimeline: (reservationId: number) =>
    apiFetch<ReservationTimeline>(`/broker/reservations/${reservationId}/timeline`),
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
  previewJoinLink: (token: string) =>
    apiFetch<BrokerJoinPreview>(
      `/broker/join/preview?token=${encodeURIComponent(token)}`,
      {},
      false,
    ),
  registerViaJoinLink: (data: {
    token: string
    name: string
    phone: string
    email: string
    password: string
  }) =>
    apiFetch<LoginResponse & { pending_approval: boolean }>('/broker/join/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),
  resendIndividualInviteFromJoin: (data: {
    token: string
    email: string
    phone: string
  }) =>
    apiFetch<{ channel: string; message: string }>('/broker/join/resend-individual-invite', {
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
  listAmenities: () => apiFetch<Amenity[]>('/admin/amenities'),
  createAmenity: (data: { name: string; slug?: string; active?: boolean }) =>
    apiFetch<Amenity>('/admin/amenities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAmenity: (id: number, data: Partial<Pick<Amenity, 'name' | 'active'>>) =>
    apiFetch<Amenity>(`/admin/amenities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

export const publicApi = {
  listBuildings: () => apiFetch<PublicBuildingListItem[]>('/public/buildings', {}, false),
  getBuilding: (slug: string) =>
    apiFetch<Building & { units?: Unit[] }>(`/public/buildings/${slug}`, {}, false),
}
