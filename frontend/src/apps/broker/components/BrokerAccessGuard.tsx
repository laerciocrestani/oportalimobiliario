import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { brokerApi } from '@/lib/api'

type BrokerAccessGuardProps = {
  children: ReactNode
}

const unrestrictedPaths = ['/pending-approval', '/account-restricted']

export function BrokerAccessGuard({ children }: BrokerAccessGuardProps) {
  const location = useLocation()
  const [target, setTarget] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (unrestrictedPaths.includes(location.pathname)) {
      setLoading(false)
      setTarget(null)
      return
    }

    let cancelled = false

    async function verify() {
      try {
        const profile = await brokerApi.getProfile()

        if (cancelled) {
          return
        }

        if (profile.access_status === 'restricted') {
          setTarget('/account-restricted')
          return
        }

        if (profile.access_status === 'pending_only') {
          setTarget('/pending-approval')
          return
        }

        setTarget(null)
      } catch {
        if (!cancelled) {
          setTarget(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    setLoading(true)
    void verify()

    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Verificando acesso...
      </div>
    )
  }

  if (target !== null && location.pathname !== target) {
    return <Navigate to={target} replace />
  }

  return children
}
