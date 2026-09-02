import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import { ProtectedRoute } from './components/admin/ProtectedRoute'
import { supabase } from './lib/supabase'
import { Landing } from './pages/participant/Landing'
import { Protocol } from './pages/participant/Protocol'
import { Reception } from './pages/participant/Reception'
import { BeforeStart } from './pages/participant/BeforeStart'
import { Consent } from './pages/participant/Consent'
import { Identification } from './pages/participant/Identification'
import { Questionnaire } from './pages/participant/Questionnaire'
import { Completion } from './pages/participant/Completion'
import { Thanks } from './pages/participant/Thanks'
import { Payment } from './pages/participant/Payment'
import { UserArea } from './pages/participant/UserArea'
import { UserAreaLogin } from './pages/participant/UserAreaLogin'
import { UserAreaRecover } from './pages/participant/UserAreaRecover'
import { UserAreaReset } from './pages/participant/UserAreaReset'

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
const Leads = lazy(() =>
  import('./pages/admin/Leads').then((m) => ({ default: m.Leads })),
)
const LeadDetail = lazy(() =>
  import('./pages/admin/LeadDetail').then((m) => ({ default: m.LeadDetail })),
)

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-se-mist">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
    </div>
  )
}

function LandingRoute() {
  const { settings, analystProfile, analystProfile2 } = useSettings()
  return (
    <Landing
      analystProfile={analystProfile}
      analystProfile2={analystProfile2 ?? undefined}
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

function UserAreaRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/minha-area/login', { replace: true })
        return
      }
      setChecking(false)
    })
  }, [navigate])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-se-mist">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
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
            <Route path="/pagamento" element={<Payment />} />
            <Route path="/minha-area/login" element={<UserAreaLogin />} />
            <Route path="/minha-area/recuperar-senha" element={<UserAreaRecover />} />
            <Route path="/minha-area/redefinir-senha" element={<UserAreaReset />} />
            <Route path="/minha-area" element={<UserAreaRoute><UserArea /></UserAreaRoute>} />

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
              path="/admin/interesses"
              element={<AdminRoute><Leads /></AdminRoute>}
            />
            <Route
              path="/admin/interesses/:id"
              element={<AdminRoute><LeadDetail /></AdminRoute>}
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
