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
