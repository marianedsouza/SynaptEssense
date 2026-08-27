import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import { ProtectedRoute } from './components/admin/ProtectedRoute'
import { Landing } from './pages/participant/Landing'
import { Protocol } from './pages/participant/Protocol'
import { Reception } from './pages/participant/Reception'
import { BeforeStart } from './pages/participant/BeforeStart'
import { Consent } from './pages/participant/Consent'
import { Identification } from './pages/participant/Identification'
import { Questionnaire } from './pages/participant/Questionnaire'
import { Completion } from './pages/participant/Completion'
import { Thanks } from './pages/participant/Thanks'

const AdminLogin = lazy(() =>
  import('./pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })),
)
const Dashboard = lazy(() =>
  import('./pages/admin/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const ParticipantDetail = lazy(() =>
  import('./pages/admin/ParticipantDetail').then((m) => ({
    default: m.ParticipantDetail,
  })),
)
const Settings = lazy(() =>
  import('./pages/admin/Settings').then((m) => ({ default: m.Settings })),
)

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-se-mist">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
    </div>
  )
}

function LandingRoute() {
  const { settings, analystProfile } = useSettings()
  return (
    <Landing
      analystProfile={analystProfile}
      heroMessage={
        settings.hero_message ??
        'Toda transformação começa quando novas conexões são criadas.'
      }
    />
  )
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<LandingRoute />} />
            <Route path="/protocolo" element={<Protocol />} />
            <Route path="/recepcao" element={<Reception />} />
            <Route path="/antes-de-comecar" element={<BeforeStart />} />
            <Route path="/consentimento" element={<Consent />} />
            <Route path="/identificacao" element={<Identification />} />
            <Route path="/levantamento" element={<Questionnaire />} />
            <Route path="/concluido" element={<Completion />} />
            <Route path="/obrigado" element={<Thanks />} />

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
            <Route
              path="/admin/participantes"
              element={<AdminRoute><Dashboard /></AdminRoute>}
            />
            <Route
              path="/admin/participantes/:id"
              element={<AdminRoute><ParticipantDetail /></AdminRoute>}
            />
            <Route
              path="/admin/configuracoes"
              element={<AdminRoute><Settings /></AdminRoute>}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SettingsProvider>
  )
}

export default App
