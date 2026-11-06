const TOKEN_KEY = 'opim_token'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 60

export function readSharedToken(): string | null {
  const match = document.cookie.match(/(?:^|; )opim_token=([^;]*)/)

  if (!match?.[1]) {
    return null
  }

  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

export function writeSharedToken(token: string): void {
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`
}

export function clearSharedToken(): void {
  document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
}
