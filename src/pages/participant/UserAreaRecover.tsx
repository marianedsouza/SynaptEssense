import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, KeyRound, Mail } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'
import { supabase } from '../../lib/supabase'

export function UserAreaRecover() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Informe seu e-mail para recuperar a senha.')
      return
    }
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/minha-area/redefinir-senha`,
    })
    setLoading(false)

    // Supabase always reports success (even if the email doesn't exist) to avoid
    // leaking which accounts exist.
    if (error && !['email_provider_disabled', 'provider_disabled'].includes(error.message)) {
      setError(`Erro: ${error.message}`)
      return
    }
    setSent(true)
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
                  Recuperar senha
                </h1>
              </div>
            </div>

            {sent ? (
              <div className="mt-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-se-teal/10">
                  <Mail className="h-7 w-7 text-se-teal" />
                </div>
                <h2 className="mt-5 font-display text-lg font-semibold text-ink">
                  Verifique seu e-mail
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Se houver uma conta associada a{' '}
                  <strong className="text-ink">{email.trim()}</strong>, enviaremos um link
                  para redefinir sua senha.
                </p>
                <button onClick={() => setSent(false)} className="btn-secondary mt-6 w-full">
                  Enviar para outro e-mail
                </button>
              </div>
            ) : (
              <>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="label" htmlFor="recoverEmail">
                      E-mail cadastrado
                    </label>
                    <input
                      id="recoverEmail"
                      type="email"
                      className="input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  className="btn-primary mt-6 w-full"
                  disabled={loading}
                >
                  {loading ? 'Enviando…' : 'Enviar link de recuperação'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>
          <p className="mt-6 text-center text-xs text-ink-muted">
            Lembrou sua senha?{' '}
            <button onClick={() => navigate('/minha-area/login')} className="text-se-violet underline">
              Entrar
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
