import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'
import { supabase } from '../../lib/supabase'

export function UserAreaLogin() {
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
    navigate('/minha-area')
  }

  return (
    <div className="relative min-h-screen bg-se-mist">
      <NeuralBackground className="opacity-20 fixed inset-0" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <button onClick={() => navigate('/')} className="transition hover:opacity-70">
          <Logo size="md" />
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center px-6 pb-20 pt-10">
        <div className="w-full animate-fade-up">
          <div className="card mt-8 p-8">
            <div className="flex items-center gap-3">
              <div className="bg-grad grid h-10 w-10 place-items-center rounded-xl">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                  Área do participante
                </div>
                <h1 className="font-display text-xl font-semibold text-ink">
                  Bem-vindo(a) de volta
                </h1>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="uaEmail">
                  E-mail
                </label>
                <input
                  id="uaEmail"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="label" htmlFor="uaPassword">
                  Senha
                </label>
                <input
                  id="uaPassword"
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

            <div className="mt-4 text-right">
              <button
                onClick={() => navigate('/minha-area/recuperar-senha')}
                className="text-xs text-ink-muted underline transition hover:text-se-violet"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              onClick={handleLogin}
              className="btn-primary mt-2 w-full"
              disabled={loading}
            >
              {loading ? 'Entrando…' : 'Entrar'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-6 text-center text-xs text-ink-muted">
            Não possui acesso? Adquira o protocolo na página{' '}
            <button onClick={() => navigate('/protocolo')} className="text-se-violet underline">
              Protocolo de Resgate de Identidade
            </button>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
