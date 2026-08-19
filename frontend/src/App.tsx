import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ImpersonatePage } from '@/apps/auth/ImpersonatePage'
import { LoginPage } from '@/apps/auth/LoginPage'
import { LegacyPathNotice } from '@/apps/auth/LegacyPathNotice'
import { PortalGuidePage } from '@/apps/auth/PortalGuidePage'
import { AdminHome } from '@/apps/admin/AdminHome'
import { AmenitiesPage } from '@/apps/admin/AmenitiesPage'
import { InccIndicesPage } from '@/apps/admin/InccIndicesPage'
import { TenantEditPage } from '@/apps/admin/TenantEditPage'
import { ActivityPage as AdminActivityPage } from '@/apps/admin/ActivityPage'
import { BuildingDetailPage } from '@/apps/builder/BuildingDetailPage'
import { BuildingEditPage } from '@/apps/builder/BuildingEditPage'
import { BuilderHome } from '@/apps/builder/BuilderHome'
import { BuildingWizardPage } from '@/apps/builder/BuildingWizardPage'
import { BuildingsPage } from '@/apps/builder/BuildingsPage'
import { InvitesPage } from '@/apps/builder/InvitesPage'
import { BrokersPage } from '@/apps/builder/BrokersPage'
import { ReservationsPage } from '@/apps/builder/ReservationsPage'
import { ContractsPage } from '@/apps/builder/ContractsPage'
import { TeamPage } from '@/apps/builder/TeamPage'
import { ActivityPage } from '@/apps/builder/ActivityPage'
import { BrokerBuildingsPage } from '@/apps/broker/BrokerBuildingsPage'
import { BrokerClientsPage } from '@/apps/broker/BrokerClientsPage'
import { BrokerOverviewPage } from '@/apps/broker/BrokerOverviewPage'
import { BrokerReservationsPage } from '@/apps/broker/BrokerReservationsPage'
import { ActivityPage as BrokerActivityPage } from '@/apps/broker/ActivityPage'
import { InviteAcceptPage } from '@/apps/broker/InviteAcceptPage'
import { JoinAcceptPage } from '@/apps/broker/JoinAcceptPage'
import { PendingApprovalPage } from '@/apps/broker/PendingApprovalPage'
import { RestrictedAccessPage } from '@/apps/broker/RestrictedAccessPage'
import { BrokerAccessGuard } from '@/apps/broker/components/BrokerAccessGuard'
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
              path="/buildings/new"
              element={
                <ProfileGuard profile={profile}>
                  <BuildingWizardPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/buildings/:buildingId/wizard"
              element={
                <ProfileGuard profile={profile}>
                  <BuildingWizardPage />
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
              path="/brokers"
              element={
                <ProfileGuard profile={profile}>
                  <BrokersPage />
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
            <Route
              path="/contracts"
              element={
                <ProfileGuard profile={profile}>
                  <ContractsPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/activity"
              element={
                <ProfileGuard profile={profile}>
                  <ActivityPage />
                </ProfileGuard>
              }
            />
          </>
        ) : profile === 'broker' ? (
          <>
            <Route path="/invite/:token" element={<InviteAcceptPage />} />
            <Route path="/join/:token" element={<JoinAcceptPage />} />
            <Route
              path="/pending-approval"
              element={
                <ProfileGuard profile={profile}>
                  <PendingApprovalPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/account-restricted"
              element={
                <ProfileGuard profile={profile}>
                  <RestrictedAccessPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/"
              element={
                <ProfileGuard profile={profile}>
                  <BrokerAccessGuard>
                    <BrokerOverviewPage />
                  </BrokerAccessGuard>
                </ProfileGuard>
              }
            />
            <Route
              path="/buildings"
              element={
                <ProfileGuard profile={profile}>
                  <BrokerAccessGuard>
                    <BrokerBuildingsPage />
                  </BrokerAccessGuard>
                </ProfileGuard>
              }
            />
            <Route
              path="/clients"
              element={
                <ProfileGuard profile={profile}>
                  <BrokerAccessGuard>
                    <BrokerClientsPage />
                  </BrokerAccessGuard>
                </ProfileGuard>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProfileGuard profile={profile}>
                  <BrokerAccessGuard>
                    <BrokerReservationsPage />
                  </BrokerAccessGuard>
                </ProfileGuard>
              }
            />
            <Route
              path="/activity"
              element={
                <ProfileGuard profile={profile}>
                  <BrokerAccessGuard>
                    <BrokerActivityPage />
                  </BrokerAccessGuard>
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
            <Route
              path="/incc"
              element={
                <ProfileGuard profile={profile}>
                  <InccIndicesPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/amenities"
              element={
                <ProfileGuard profile={profile}>
                  <AmenitiesPage />
                </ProfileGuard>
              }
            />
            <Route
              path="/activity"
              element={
                <ProfileGuard profile={profile}>
                  <AdminActivityPage />
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
  if (profile !== null && isAuthenticatedProfile(profile)) {
    return <AuthenticatedPortal />
  }

  return <UnknownHostPortal />
}

export default App
