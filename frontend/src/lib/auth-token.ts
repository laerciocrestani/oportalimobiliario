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

  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage can be blocked. The cookie on this host still identifies the session.
  }
}

export function clearSharedToken(): void {
  document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`

  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // The cookie clear still logs this host out.
  }
}

export function currentToken(): string | null {
  const shared = readSharedToken()

  try {
    const local = localStorage.getItem(TOKEN_KEY)

    if (shared) {
      if (shared !== local) {
        localStorage.setItem(TOKEN_KEY, shared)
      }

      return shared
    }

    if (local) {
      writeSharedToken(local)

      return local
    }
  } catch {
    return shared
  }

  return null
}
