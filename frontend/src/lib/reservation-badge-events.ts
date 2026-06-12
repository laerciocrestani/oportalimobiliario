export const RESERVATION_BADGE_REFRESH_EVENT = 'opim:reservation-badge-refresh'

export function notifyReservationBadgeRefresh(): void {
  window.dispatchEvent(new Event(RESERVATION_BADGE_REFRESH_EVENT))
}
