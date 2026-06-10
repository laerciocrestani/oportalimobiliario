import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/apps/auth/LoginPage'
import { LegacyPathNotice } from '@/apps/auth/LegacyPathNotice'
import { PortalGuidePage } from '@/apps/auth/PortalGuidePage'
import { AdminHome } from '@/apps/admin/AdminHome'
import { BuilderHome } from '@/apps/builder/BuilderHome'
import { BrokerHome } from '@/apps/broker/BrokerHome'
import { PublicHome } from '@/apps/public/PublicHome'
import { ProfileGuard } from '@/components/auth/ProfileGuard'
import { isAuthenticatedProfile, resolveProfile } from '@/lib/profile'

const profile = resolveProfile(window.location.hostname)

const authenticatedHomes = {
  builder: BuilderHome,
  broker: BrokerHome,
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
        <Route
          path="/"
          element={
            <ProfileGuard profile={profile}>
              <Home />
            </ProfileGuard>
          }
        />
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
