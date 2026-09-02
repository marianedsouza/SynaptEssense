import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CreditCard, Shield, Lock, QrCode, Landmark } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../context/SettingsContext'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

type ModalityType = 'social' | 'integral'
type PlanType = 'mensal' | 'completo'

const MODALITY_LABELS: Record<ModalityType, string> = {
  social: 'Modalidade Social',
  integral: 'Protocolo Integral de Reconstrução',
}

export function Payment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { settings } = useSettings()

  const modality = (searchParams.get('modalidade') as ModalityType) || 'social'
  const plan = (searchParams.get('plano') as PlanType) || 'completo'

  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [step, setStep] = useState<'form' | 'processing' | 'error'>('form')
  const [errorMessage, setErrorMessage] = useState('')

  const amount = (() => {
    if (modality === 'social') {
      return (parseFloat(plan === 'mensal' ? settings.payment_social_monthly : settings.payment_social_complete) || 0)
    }
    return (parseFloat(plan === 'mensal' ? settings.payment_integral_monthly : settings.payment_integral_complete) || 0)
  })()

  const isFormValid = values.name.trim() &&
    values.email.trim() &&
    values.phone.trim() &&
    values.password.length >= 6

  function handleInputChange(field: string, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function handleGoToPayment() {
    if (!isFormValid) return

    setStep('processing')
    setErrorMessage('')

    try {
      // 1. Create / authenticate the user's account
      const email = values.email.trim().toLowerCase()
      let userId: string | null = null
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: { name: values.name.trim(), phone: values.phone.trim() },
        },
      })
      if (signUpError) {
        throw new Error(`Não foi possível criar o acesso: ${signUpError.message}`)
      }
      userId = signUpData.user?.id ?? null

      // 2. Create lead (protocol interest) bound to user + plan
      let leadId: string | null = null
      try {
        const { data: leadData } = await supabase
          .from('protocol_leads')
          .insert({
            name: values.name.trim(),
            phone: values.phone.trim(),
            email,
            plan,
            user_id: userId,
            modality,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        if (leadData) leadId = leadData.id
      } catch {
        // continue even if lead save fails
      }

      // 3. Create MercadoPago Checkout Pro preference
      if (!amount || amount <= 0) {
        throw new Error('Valor do plano não configurado. Informe os valores no painel do analista.')
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-preference`

      let response: Response
      try {
        response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
            'x-site-url': window.location.origin,
          },
          body: JSON.stringify({
            modalidade: modality,
            plan,
            amount,
            name: values.name.trim(),
            email,
            phone: values.phone.trim(),
            lead_id: leadId,
          }),
        })
      } catch (err) {
        console.error('Fetch create-preference falhou:', err)
        throw new Error(
          'Não foi possível conectar ao servidor de pagamento. Verifique se a função ' +
          'create-preference está publicada no Supabase e se a URL do projeto está correta na variável VITE_SUPABASE_URL.',
        )
      }

      let result: Record<string, unknown>
      try {
        result = await response.json()
      } catch {
        throw new Error(
          'Resposta inesperada do servidor (código ' + response.status + '). ' +
          'Confirme que a Edge Function create-preference foi publicada com: supabase functions deploy create-preference',
        )
      }

      if (!response.ok) {
        const errMsg = typeof result.error === 'string' ? result.error : 'Erro ao criar o pagamento.'
        throw new Error(errMsg)
      }

      const initPoint = (typeof result.init_point === 'string' && result.init_point)
        || (typeof result.sandbox_init_point === 'string' && result.sandbox_init_point)
      if (!initPoint) {
        throw new Error('Não foi possível obter o link de pagamento do Mercado Pago.')
      }

      window.location.href = initPoint
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao iniciar o pagamento.')
      setStep('error')
    }
  }

  const planLabel = plan === 'mensal' ? 'Plano mensal' : 'Plano completo'

  return (
    <div className="relative min-h-screen bg-se-mist">
      <NeuralBackground className="opacity-20 fixed inset-0" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <button onClick={() => navigate('/protocolo')} className="transition hover:opacity-70">
          <Logo size="md" />
        </button>
        <button
          onClick={() => navigate('/protocolo')}
          className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs font-medium text-ink-soft backdrop-blur transition hover:border-se-violet/30 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-6 pb-20 pt-8">
        {step === 'form' && (
          <>
            <div className="text-center mb-8">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                Pagamento seguro
              </div>
              <h1 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">
                {MODALITY_LABELS[modality]}
              </h1>
              <p className="mt-3 text-sm text-ink-soft">
                Complete seus dados e crie seu acesso para acompanhar seu protocolo.
              </p>
            </div>

            {/* Amount Card */}
            <div className="card mb-6 p-6 text-center">
              <div className="text-sm text-ink-muted">Valor a pagar • {planLabel}</div>
              <div className="mt-1 font-display text-4xl font-semibold text-ink">
                R$ {amount.toFixed(2).replace('.', ',')}
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Pagamento único do {planLabel.toLowerCase()} via Mercado Pago.
              </p>
            </div>

            {/* Form */}
            <div className="card p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="h-5 w-5 text-se-violet" />
                <h2 className="font-display text-lg font-semibold text-ink">Seus dados e acesso</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="pay-name">Nome completo</label>
                  <input
                    id="pay-name"
                    type="text"
                    className="input"
                    value={values.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Seu nome completo"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pay-email">E-mail</label>
                  <input
                    id="pay-email"
                    type="email"
                    className="input"
                    value={values.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pay-phone">WhatsApp / Telefone</label>
                  <input
                    id="pay-phone"
                    type="tel"
                    className="input"
                    value={values.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pay-password">Senha de acesso</label>
                  <input
                    id="pay-password"
                    type="password"
                    className="input"
                    value={values.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-xs text-ink-muted">
                    Você usará esta senha para acessar sua área pessoal e acompanhar seu protocolo.
                  </p>
                </div>
              </div>

              <button
                onClick={handleGoToPayment}
                disabled={!isFormValid}
                className="btn-primary mt-6 w-full disabled:opacity-40 disabled:pointer-events-none"
              >
                Ir para o pagamento
                <Lock className="h-4 w-4" />
              </button>

              {/* Payment methods hint */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-ink/5 bg-se-mist/60 px-2 py-3 text-center">
                  <CreditCard className="h-4 w-4 text-se-violet" />
                  <span className="text-[10px] font-medium text-ink-muted">Cartão</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-ink/5 bg-se-mist/60 px-2 py-3 text-center">
                  <QrCode className="h-4 w-4 text-se-violet" />
                  <span className="text-[10px] font-medium text-ink-muted">PIX</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-ink/5 bg-se-mist/60 px-2 py-3 text-center">
                  <Landmark className="h-4 w-4 text-se-violet" />
                  <span className="text-[10px] font-medium text-ink-muted">Boleto</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-ink-muted">
                <Shield className="h-3.5 w-3.5" />
                Você será redirecionado para o pagamento seguro do Mercado Pago.
              </div>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-se-lavender">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
            </div>
            <h2 className="mt-6 font-display text-xl font-semibold text-ink">
              Redirecionando para o pagamento...
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Aguarde enquanto preparamos seu checkout seguro no Mercado Pago.
            </p>
          </div>
        )}

        {step === 'error' && (
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="mt-6 font-display text-xl font-semibold text-ink">
              Houve um problema
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {errorMessage || 'Não foi possível iniciar o pagamento. Tente novamente.'}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setStep('form')
                  setErrorMessage('')
                }}
                className="btn-secondary flex-1"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => navigate('/protocolo')}
                className="btn-primary flex-1"
              >
                Voltar ao protocolo
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-10 text-center">
        <div className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          <p>A tecnologia organiza dados.</p>
          <p>A metodologia gera compreensão.</p>
          <p>O especialista conduz a transformação.</p>
        </div>
      </footer>
    </div>
  )
}
