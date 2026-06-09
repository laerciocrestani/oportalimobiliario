const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: string
  tenant_id: number | null
}

export type LoginResponse = {
  token: string
  user: AuthUser
}

export type Empreendimento = {
  id: number
  nome: string
  descricao: string | null
  cidade: string | null
  estado: string | null
  publicado: boolean
  seo_title: string | null
  seo_description: string | null
  unidades_count?: number
}

export type Unidade = {
  id: number
  codigo: string
  andar: number | null
  area_m2: string | null
  preco: string | null
  status: string
  empreendimento?: Empreendimento
}

export type Tenant = {
  id: number
  name: string
  slug: string
  active: boolean
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

export const construtoraApi = {
  listEmpreendimentos: () => apiFetch<Empreendimento[]>('/construtora/empreendimentos'),
  createEmpreendimento: (data: Partial<Empreendimento>) =>
    apiFetch<Empreendimento>('/construtora/empreendimentos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listUnidades: (empreendimentoId: number) =>
    apiFetch<Unidade[]>(`/construtora/empreendimentos/${empreendimentoId}/unidades`),
  createUnidade: (empreendimentoId: number, data: Partial<Unidade>) =>
    apiFetch<Unidade>(`/construtora/empreendimentos/${empreendimentoId}/unidades`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createConvite: (email: string) =>
    apiFetch<{ token: string; email: string }>('/construtora/convites', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  grantAcesso: (corretorId: number, unidadeId: number) =>
    apiFetch('/construtora/acessos', {
      method: 'POST',
      body: JSON.stringify({ corretor_id: corretorId, unidade_id: unidadeId }),
    }),
}

export const corretorApi = {
  listUnidades: () => apiFetch<Unidade[]>('/corretor/unidades'),
  createReserva: (unidadeId: number) =>
    apiFetch('/corretor/reservas', {
      method: 'POST',
      body: JSON.stringify({ unidade_id: unidadeId }),
    }),
  acceptConvite: (token: string) =>
    apiFetch('/corretor/convites/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
}

export const adminApi = {
  listTenants: () => apiFetch<Paginated<Tenant>>('/admin/tenants'),
  createTenant: (data: Partial<Tenant>) =>
    apiFetch<Tenant>('/admin/tenants', { method: 'POST', body: JSON.stringify(data) }),
  updateTenant: (id: number, data: Partial<Tenant>) =>
    apiFetch<Tenant>(`/admin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const publicApi = {
  listEmpreendimentos: () => apiFetch<Empreendimento[]>('/public/empreendimentos', {}, false),
  getEmpreendimento: (id: number) =>
    apiFetch<Empreendimento & { unidades?: Unidade[] }>(`/public/empreendimentos/${id}`, {}, false),
}
