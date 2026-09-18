import { useCallback, useEffect, useState } from 'react'
import { RESERVATION_BADGE_REFRESH_EVENT } from '@/lib/reservation-badge-events'
import { builderApi, brokerApi } from '@/lib/api'

export function useReservationNavBadge(profile: 'builder' | 'broker', enabled: boolean) {
  const [count, setCount] = useState(0)
  const [witnessScope, setWitnessScope] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCount(0)
      setWitnessScope(false)
      return
    }

    try {
      const result =
        profile === 'builder'
          ? await builderApi.pendingActionsCount()
          : await brokerApi.pendingActionsCount()
      setCount(result.count)
      setWitnessScope(result.witness_scope)
    } catch {
      setCount(0)
      setWitnessScope(false)
    }
  }, [enabled, profile])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    function handleRefresh() {
      void refresh()
    }

    window.addEventListener(RESERVATION_BADGE_REFRESH_EVENT, handleRefresh)

    return () => {
      window.removeEventListener(RESERVATION_BADGE_REFRESH_EVENT, handleRefresh)
    }
  }, [refresh])

  return { count, witnessScope, refresh }
}
