import { useEffect } from 'react'
import { clearSharedToken, currentToken, writeSharedToken } from '@/lib/auth-token'

const ALLOWED_ORIGINS = new Set(['http://www.localhost:4321', 'http://corretor.localhost:5173'])

function parentOrigin(): string | null {
  if (!document.referrer) {
    return null
  }

  try {
    return new URL(document.referrer).origin
  } catch {
    return null
  }
}

export function SessionBridgePage() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      const api = import.meta.env.VITE_API_URL ?? 'http://api.localhost:8000/api'

      void fetch(`${api.replace(/\/$/, '')}/auth/handoff/exchange`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then(async (response) => {
          if (!response.ok) {
            window.location.replace('/login')
            return
          }

          const body = (await response.json()) as { token?: string }

          if (!body.token) {
            window.location.replace('/login')
            return
          }

          writeSharedToken(body.token)
          window.location.replace('/')
        })
        .catch(() => {
          window.location.replace('/login')
        })

      return
    }

    const target = parentOrigin()

    function publish(token: string | null): void {
      if (!target || !ALLOWED_ORIGINS.has(target) || window.parent === window || !token) {
        return
      }

      window.parent.postMessage({ type: 'opim-token', token }, target)
    }

    function onMessage(event: MessageEvent): void {
      if (event.data?.type === 'opim-bridge-ping') {
        if (event.origin !== target) {
          return
        }

        if (target && ALLOWED_ORIGINS.has(target) && window.parent !== window) {
          window.parent.postMessage({ type: 'opim-bridge-ready' }, target)
        }

        return
      }

      if (!ALLOWED_ORIGINS.has(event.origin) || event.data?.type !== 'opim-token') {
        return
      }

      if (typeof event.data.token === 'string' && event.data.token !== '') {
        writeSharedToken(event.data.token)
        return
      }

      if (event.data.token === null) {
        clearSharedToken()
      }
    }

    window.addEventListener('message', onMessage)
    publish(currentToken())

    if (target && ALLOWED_ORIGINS.has(target) && window.parent !== window) {
      window.parent.postMessage({ type: 'opim-bridge-ready' }, target)
    }

    return () => window.removeEventListener('message', onMessage)
  }, [])

  return null
}
