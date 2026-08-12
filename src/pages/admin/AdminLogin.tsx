import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { supabase } from '../../lib/supabase'

export function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha para entrar.')
      return
    }
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(`Erro: ${error.message}`)
      return
    }
    navigate('/admin')
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-se-mist px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-se-violet/10 blur-3xl" />
        <div className="absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-se-teal/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="card mt-8 p-8">
          <div className="flex items-center gap-3">
            <div className="bg-grad grid h-10 w-10 place-items-center rounded-xl">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                Área restrita
              </div>
              <h1 className="font-display text-xl font-semibold text-ink">
                Acesso do analista
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="adminEmail">
                E-mail
              </label>
              <input
                id="adminEmail"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="adminPassword">
                Senha
              </label>
              <input
                id="adminPassword"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Sua senha"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="btn-primary mt-6 w-full"
            disabled={loading}
          >
            {loading ? 'Entrando…' : 'Entrar'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-ink-muted">
          SynaptEssence360® — Plataforma de Tecnologia Social para o Desenvolvimento Humano Integral
        </p>
      </div>
    </div>
  )
}
