import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/apps/auth/LoginPage'
import { LegacyPathNotice } from '@/apps/auth/LegacyPathNotice'
import { PortalGuidePage } from '@/apps/auth/PortalGuidePage'
import { AdminHome } from '@/apps/admin/AdminHome'
import { ConstrutoraHome } from '@/apps/construtora/ConstrutoraHome'
import { CorretorHome } from '@/apps/corretor/CorretorHome'
import { PublicoHome } from '@/apps/publico/PublicoHome'
import { ProfileGuard } from '@/components/auth/ProfileGuard'
import { isAuthenticatedProfile, resolveProfile } from '@/lib/profile'

const profile = resolveProfile(window.location.hostname)

const authenticatedHomes = {
  construtora: ConstrutoraHome,
  corretor: CorretorHome,
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
        <Route path="/" element={<PublicoHome />} />
      </Routes>
    </BrowserRouter>
  )
}

function UnknownHostPortal() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/construtora" element={<LegacyPathNotice profile="construtora" />} />
        <Route path="/corretor" element={<LegacyPathNotice profile="corretor" />} />
        <Route path="/admin" element={<LegacyPathNotice profile="admin" />} />
        <Route path="/publico" element={<LegacyPathNotice profile="publico" />} />
        <Route path="*" element={<PortalGuidePage />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  if (profile === 'publico') {
    return <PublicPortal />
  }

  if (profile !== null && isAuthenticatedProfile(profile)) {
    return <AuthenticatedPortal />
  }

  return <UnknownHostPortal />
}

export default App
