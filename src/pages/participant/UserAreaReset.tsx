import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, KeyRound } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'
import { supabase } from '../../lib/supabase'

export function UserAreaReset() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const recovery = data.session?.user?.app_metadata?.provider === 'email'
        && window.location.hash.includes('type=recovery')
      if (!recovery) {
        setInfo('Link de recuperação inválido ou expirado. Solicite um novo link para continuar.')
        setChecking(false)
        return
      }
      setChecking(false)
    })
  }, [])

  const isFormValid = password.length >= 6 && password === confirm

  const handleSubmit = async () => {
    if (!isFormValid) {
      setError('Informe e confirme uma senha com no mínimo 6 caracteres.')
      return
    }
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(`Erro: ${error.message}`)
      return
    }
    setDone(true)
    setTimeout(() => navigate('/minha-area/login'), 2000)
  }

  return (
    <div className="relative min-h-screen bg-se-mist">
      <NeuralBackground className="opacity-20 fixed inset-0" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <button onClick={() => navigate('/')} className="transition hover:opacity-70">
          <Logo size="md" />
        </button>
        <button
          onClick={() => navigate('/minha-area/login')}
          className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs font-medium text-ink-soft backdrop-blur transition hover:border-se-violet/30 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center px-6 pb-20 pt-10">
        <div className="w-full animate-fade-up">
          <div className="card mt-8 p-8">
            <div className="flex items-center gap-3">
              <div className="bg-grad grid h-10 w-10 place-items-center rounded-xl">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                  Área do participante
                </div>
                <h1 className="font-display text-xl font-semibold text-ink">
                  Redefinir senha
                </h1>
              </div>
            </div>

            {checking ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
              </div>
            ) : done ? (
              <div className="mt-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-se-teal/10">
                  <Check className="h-7 w-7 text-se-teal" />
                </div>
                <h2 className="mt-5 font-display text-lg font-semibold text-ink">
                  Senha atualizada!
                </h2>
                <p className="mt-2 text-sm text-ink-soft">
                  Redirecionando para o login...
                </p>
              </div>
            ) : info ? (
              <div className="mt-6">
                <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {info}
                </div>
                <button onClick={() => navigate('/minha-area/login')} className="btn-primary mt-6 w-full">
                  Voltar ao login
                </button>
              </div>
            ) : (
              <>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="label" htmlFor="resetPassword">
                      Nova senha
                    </label>
                    <input
                      id="resetPassword"
                      type="password"
                      className="input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="resetConfirm">
                      Confirmar nova senha
                    </label>
                    <input
                      id="resetConfirm"
                      type="password"
                      className="input"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="Repita a nova senha"
                      autoComplete="new-password"
                    />
                  </div>
                  {!isFormValid && confirm.length > 0 && password !== confirm && (
                    <p className="text-xs text-red-600">As senhas não coincidem.</p>
                  )}
                </div>

                {error && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  className="btn-primary mt-6 w-full"
                  disabled={loading || !isFormValid}
                >
                  {loading ? 'Salvando…' : 'Definir nova senha'}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
