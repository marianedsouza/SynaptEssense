import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, CreditCard, Shield, Lock } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'
import { supabase } from '../../lib/supabase'
import { initMercadoPago, Payment as PaymentBrick } from '@mercadopago/sdk-react'

const mpPublicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (mpPublicKey) {
  initMercadoPago(mpPublicKey, { locale: 'pt-BR' })
}

type ModalityType = 'social' | 'integral'

const MODALITY_LABELS: Record<ModalityType, string> = {
  social: 'Modalidade Social',
  integral: 'Protocolo Integral de Reconstrução',
}

export function Payment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const modality = (searchParams.get('modalidade') as ModalityType) || 'social'
  const amountParam = searchParams.get('valor')

  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [step, setStep] = useState<'form' | 'payment' | 'processing' | 'success' | 'error'>('form')
  const [errorMessage, setErrorMessage] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const brickKey = useRef(0)

  const amount = useMemo(() => {
    if (amountParam) {
      const parsed = parseFloat(amountParam)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
    return 3.0
  }, [amountParam])

  const isFormValid = values.name.trim() && values.email.trim() && values.phone.trim()

  useEffect(() => {
    if (!mpPublicKey) {
      setErrorMessage('Chave pública do Mercado Pago não configurada.')
      setStep('error')
    }
  }, [])

  function handleInputChange(field: string, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function goToPayment() {
    if (!isFormValid) return
    brickKey.current += 1
    setStep('payment')
  }

  async function handlePaymentSubmit(paymentData: any) {
    setStep('processing')

    try {
      const formData = paymentData.formData as Record<string, unknown>

      // Create lead first
      let leadId: string | null = null
      try {
        const { data: leadData, error: leadError } = await supabase
          .from('protocol_leads')
          .insert({
            name: values.name.trim(),
            phone: values.phone.trim(),
            modality,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (!leadError && leadData) {
          leadId = leadData.id
        }
      } catch {
        // continue even if lead save fails
      }

      // Process payment via Edge Function
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/process-payment`

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          token: formData.token,
          issuer_id: formData.issuer_id,
          payment_method_id: formData.payment_method_id,
          transaction_amount: formData.transaction_amount,
          installments: formData.installments,
          payer_email: (formData.payer as Record<string, unknown>)?.email || values.email,
          payer_name: values.name.trim(),
          payer_phone: values.phone.trim(),
          lead_id: leadId,
          modality,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento.')
      }

      setPaymentStatus(result.status)
      setStep('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao processar pagamento.')
      setStep('error')
    }
  }

  function handlePaymentError() {
    setErrorMessage('Ocorreu um erro ao inicializar o formulário de pagamento.')
    setStep('error')
  }

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
                Preencha seus dados para prosseguir com o pagamento.
              </p>
            </div>

            {/* Amount Card */}
            <div className="card mb-6 p-6 text-center">
              <div className="text-sm text-ink-muted">Valor a pagar</div>
              <div className="mt-1 font-display text-4xl font-semibold text-ink">
                R$ {amount.toFixed(2).replace('.', ',')}
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Valor de teste • Parcelamento em até 10x com juros da operadora.
              </p>
            </div>

            {/* Form */}
            <div className="card p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="h-5 w-5 text-se-violet" />
                <h2 className="font-display text-lg font-semibold text-ink">Seus dados</h2>
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
              </div>

              <button
                onClick={goToPayment}
                disabled={!isFormValid}
                className="btn-primary mt-6 w-full disabled:opacity-40 disabled:pointer-events-none"
              >
                Continuar para pagamento
                <Lock className="h-4 w-4" />
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-ink-muted">
                <Shield className="h-3.5 w-3.5" />
                Pagamento processado com segurança pelo Mercado Pago.
              </div>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <div className="text-center mb-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                Dados do cartão
              </div>
              <h1 className="mt-2 font-display text-2xl font-semibold text-ink">
                Informe os dados do seu cartão
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Valor: <strong className="text-ink">R$ {amount.toFixed(2).replace('.', ',')}</strong> •{' '}
                {MODALITY_LABELS[modality]}
              </p>
            </div>

            <div className="card p-6 md:p-8">
              <PaymentBrick
                key={brickKey.current}
                initialization={{
                  amount,
                  payer: {
                    email: values.email,
                  },
                }}
                customization={{
                  paymentMethods: {
                    creditCard: 'all',
                    debitCard: 'all',
                    maxInstallments: 1,
                  },
                  visual: {
                    style: {
                      theme: 'default',
                    },
                  },
                }}
                onSubmit={handlePaymentSubmit}
                onReady={() => {}}
                onError={handlePaymentError}
                locale="pt-BR"
              />
            </div>

            <button
              onClick={() => setStep('form')}
              className="mt-4 w-full text-center text-xs text-ink-muted hover:text-ink"
            >
              ← Voltar e alterar dados
            </button>
          </>
        )}

        {step === 'processing' && (
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-se-lavender">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
            </div>
            <h2 className="mt-6 font-display text-xl font-semibold text-ink">
              Processando pagamento...
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Aguarde enquanto validamos seu pagamento.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-se-teal/10">
              <Check className="h-8 w-8 text-se-teal" />
            </div>
            <h2 className="mt-6 font-display text-xl font-semibold text-ink">
              Pagamento realizado com sucesso!
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Seu pagamento foi aprovado. Em breve entraremos em contato pelo número informado para alinhar os próximos passos do seu{' '}
              <strong className="text-ink">{MODALITY_LABELS[modality]}</strong>.
            </p>
            <p className="mt-4 text-xs text-ink-muted">
              Status: <strong className="text-se-teal capitalize">{paymentStatus}</strong>
            </p>
            <p className="mt-1 font-display text-sm italic text-se-violet">
              Toda transformação começa quando novas conexões são criadas.
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary mt-6"
            >
              Voltar ao início
            </button>
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
              {errorMessage || 'Não foi possível processar seu pagamento. Tente novamente.'}
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
