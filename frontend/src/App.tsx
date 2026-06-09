import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminHome } from '@/apps/admin/AdminHome'
import { ConstrutoraHome } from '@/apps/construtora/ConstrutoraHome'
import { CorretorHome } from '@/apps/corretor/CorretorHome'
import { PublicoHome } from '@/apps/publico/PublicoHome'
import { AppShell } from '@/components/layout/AppShell'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/construtora" replace />} />
          <Route path="construtora" element={<ConstrutoraHome />} />
          <Route path="corretor" element={<CorretorHome />} />
          <Route path="admin" element={<AdminHome />} />
          <Route path="publico" element={<PublicoHome />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
