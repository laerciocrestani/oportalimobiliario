import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ImpersonatePage } from '@/apps/auth/ImpersonatePage'
import { LoginPage } from '@/apps/auth/LoginPage'
import { LegacyPathNotice } from '@/apps/auth/LegacyPathNotice'
import { PortalGuidePage } from '@/apps/auth/PortalGuidePage'
import { AdminHome } from '@/apps/admin/AdminHome'
import { TenantEditPage } from '@/apps/admin/TenantEditPage'
import { BuildingDetailPage } from '@/apps/builder/BuildingDetailPage'
import { BuildingEditPage } from '@/apps/builder/BuildingEditPage'
import { BuilderHome } from '@/apps/builder/BuilderHome'
import { BuildingsPage } from '@/apps/builder/BuildingsPage'
import { InvitesPage } from '@/apps/builder/InvitesPage'
import { ReservationsPage } from '@/apps/builder/ReservationsPage'
import { TeamPage } from '@/apps/builder/TeamPage'
import { BrokerBuildingsPage } from '@/apps/broker/BrokerBuildingsPage'
import { BrokerClientsPage } from '@/apps/broker/BrokerClientsPage'
import { BrokerOverviewPage } from '@/apps/broker/BrokerOverviewPage'
import { BrokerReservationsPage } from '@/apps/broker/BrokerReservationsPage'
import { InviteAcceptPage } from '@/apps/broker/InviteAcceptPage'
import { PublicHome } from '@/apps/public/PublicHome'
import { ProfileGuard } from '@/components/auth/ProfileGuard'
import { isAuthenticatedProfile, resolveProfile } from '@/lib/profile'

const profile = resolveProfile(window.location.hostname)

const authenticatedHomes = {
  builder: BuilderHome,
  broker: BrokerOverviewPage,
  admin: AdminHome,
} as const

function AuthenticatedPortal() {
  if (profile === null || !isAuthenticatedProfile(profile)) {
    return null
  }

  const Home = authenticatedHomes[profile]

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage profile={profile} />} />
        {profile === 'builder' ? (
          <>
            <Route path="/auth/impersonate" element={<ImpersonatePage />} />
            <Route
              path="/"
              element={
                <ProfileGuard profile={profile}>
                  <BuilderHome />
                </ProfileGuard>
              }
            />
            <Route
              path="/buildings"
              element={
                <ProfileGuard profile={profile}>
                  <BuildingsPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/buildings/:buildingId/edit"
              element={
                <ProfileGuard profile={profile}>
                  <BuildingEditPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/buildings/:buildingId"
              element={
                <ProfileGuard profile={profile}>
                  <BuildingDetailPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/team"
              element={
                <ProfileGuard profile={profile}>
                  <TeamPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/invites"
              element={
                <ProfileGuard profile={profile}>
                  <InvitesPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProfileGuard profile={profile}>
                  <ReservationsPage />
                </ProfileGuard>
              }
            />
          </>
        ) : profile === 'broker' ? (
          <>
            <Route path="/invite/:token" element={<InviteAcceptPage />} />
            <Route
              path="/"
              element={
                <ProfileGuard profile={profile}>
                  <BrokerOverviewPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/buildings"
              element={
                <ProfileGuard profile={profile}>
                  <BrokerBuildingsPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/clients"
              element={
                <ProfileGuard profile={profile}>
                  <BrokerClientsPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProfileGuard profile={profile}>
                  <BrokerReservationsPage />
                </ProfileGuard>
              }
            />
          </>
        ) : profile === 'admin' ? (
          <>
            <Route
              path="/"
              element={
                <ProfileGuard profile={profile}>
                  <AdminHome />
                </ProfileGuard>
              }
            />
            <Route
              path="/tenants/:tenantId/edit"
              element={
                <ProfileGuard profile={profile}>
                  <TenantEditPage />
                </ProfileGuard>
              }
            />
          </>
        ) : (
          <Route
            path="/"
            element={
              <ProfileGuard profile={profile}>
                <Home />
              </ProfileGuard>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  )
}

function PublicPortal() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicHome />} />
      </Routes>
    </BrowserRouter>
  )
}

function UnknownHostPortal() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/construtora" element={<LegacyPathNotice profile="builder" />} />
        <Route path="/corretor" element={<LegacyPathNotice profile="broker" />} />
        <Route path="/admin" element={<LegacyPathNotice profile="admin" />} />
        <Route path="/publico" element={<LegacyPathNotice profile="public" />} />
        <Route path="*" element={<PortalGuidePage />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  if (profile === 'public') {
    return <PublicPortal />
  }

  if (profile !== null && isAuthenticatedProfile(profile)) {
    return <AuthenticatedPortal />
  }

  return <UnknownHostPortal />
}

export default App
