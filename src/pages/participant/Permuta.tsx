import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Lock, Sparkles, User } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../context/SettingsContext'

// ─── Diagnostic Questions ───────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 1,
    title: 'Momento Atual',
    question: 'Como você descreveria o momento que está vivendo hoje?',
    options: [
      { label: 'Estou buscando me conhecer melhor e fazer ajustes na minha vida.', value: 1 },
      { label: 'Sinto que preciso mudar algumas áreas importantes da minha vida.', value: 2 },
      { label: 'Estou atravessando uma fase de mudanças profundas e preciso me reorganizar.', value: 3 },
      { label: 'Estou vivendo um momento decisivo e sinto necessidade de reconstruir minha forma de viver, me posicionar e me relacionar.', value: 4 },
    ],
  },
  {
    id: 2,
    title: 'Identidade e Posicionamento',
    question: 'Quando pensa em quem você é e no que realmente deseja, o que mais representa seu momento atual?',
    options: [
      { label: 'Tenho clareza sobre quem sou, mas quero evoluir.', value: 1 },
      { label: 'Sei algumas coisas que quero, mas ainda tenho dúvidas importantes.', value: 2 },
      { label: 'Sinto dificuldade para reconhecer o que realmente quero e quem estou me tornando.', value: 3 },
      { label: 'Sinto que me desconectei de mim e preciso reconstruir minha identidade e meu posicionamento.', value: 4 },
    ],
  },
  {
    id: 3,
    title: 'Relações e Sistema',
    question: 'Quanto o seu momento atual está relacionado às suas relações, família ou ambiente em que vive?',
    options: [
      { label: 'Pouco. Minha principal questão é individual.', value: 1 },
      { label: 'Existe algum impacto nas minhas relações, mas consigo lidar com isso.', value: 2 },
      { label: 'Minhas relações influenciam diretamente minhas decisões e meu processo de mudança.', value: 3 },
      { label: 'Estou vivendo questões relacionais ou familiares importantes que precisam ser consideradas no meu processo de reconstrução.', value: 4 },
    ],
  },
  {
    id: 4,
    title: 'Necessidade de Acompanhamento',
    question: 'O que você acredita que mais ajudaria durante os próximos 90 dias?',
    options: [
      { label: 'Ter encontros estruturados para refletir e desenvolver novas perspectivas.', value: 1 },
      { label: 'Ter um processo organizado que me ajude a transformar compreensão em ação.', value: 2 },
      { label: 'Ter acompanhamento mais próximo para sustentar mudanças e ajustar meu percurso.', value: 3 },
      { label: 'Ter orientação estratégica e suporte ao longo do processo, especialmente diante de situações que podem surgir entre os encontros.', value: 4 },
    ],
  },
  {
    id: 5,
    title: 'Momento Decisivo',
    question: 'Qual destas situações mais se aproxima do que você está vivendo hoje?',
    options: [
      { label: 'Quero iniciar uma fase de desenvolvimento pessoal com mais consciência.', value: 1 },
      { label: 'Quero mudar padrões e construir uma forma mais coerente de viver.', value: 2 },
      { label: 'Estou diante de decisões ou mudanças relevantes e quero apoio para atravessá-las.', value: 3 },
      { label: 'Estou reconstruindo uma parte importante da minha vida e preciso de um acompanhamento mais próximo, personalizado e estratégico.', value: 4 },
    ],
  },
]

type ModalityType = 'social' | 'integral'
type PlanType = 'mensal' | 'completo'

const MODALITY_LABELS: Record<ModalityType, string> = {
  social: 'Modalidade Social',
  integral: 'Protocolo Integral de Reconstrução',
}

function fmtPrice(value?: string) {
  const n = parseFloat(value || '0')
  if (isNaN(n) || n <= 0) return '0,00'
  return n.toFixed(2).replace('.', ',')
}

export function Permuta() {
  const navigate = useNavigate()
  const { settings } = useSettings()

  const [step, setStep] = useState<
    'intro' | 'quiz' | 'result' | 'choose' | 'form' | 'processing' | 'error'
  >('intro')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null, null, null])
  const [recommendation, setRecommendation] = useState<'social' | 'transition' | 'integral'>('social')
  const [modality, setModality] = useState<ModalityType>('social')
  const [plan, setPlan] = useState<PlanType>('completo')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState<string | null>(null)

  function calculateRecommendation() {
    const score = answers.reduce<number>((sum, a) => sum + (a ?? 0), 0)
    if (score <= 10) return 'social'
    if (score <= 15) return 'transition'
    return 'integral'
  }

  function handleAnswer(value: number) {
    const next = [...answers]
    next[currentQuestion] = value
    setAnswers(next)
  }

  function handleNext() {
    if (currentQuestion < 4) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setRecommendation(calculateRecommendation())
      setStep('result')
    }
  }

  function handlePrev() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  function goToChoose() {
    setStep('choose')
  }

  function goToForm() {
    setStep('form')
  }

  const isFormValid =
    form.name.trim() && form.email.trim() && form.phone.trim() && form.password.length >= 6

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreateAccess() {
    if (!isFormValid) {
      setError('Preencha todos os campos para criar seu acesso.')
      return
    }
    setStep('processing')
    setError(null)
    try {
      const email = form.email.trim().toLowerCase()
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: { name: form.name.trim(), phone: form.phone.trim() },
        },
      })
      if (signUpError) {
        throw new Error(`Não foi possível criar o acesso: ${signUpError.message}`)
      }
      const userId = signUpData.user?.id ?? null

      const { error: leadError } = await supabase.from('protocol_leads').insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email,
        plan,
        user_id: userId,
        modality,
        payment_mode: 'permuta',
        created_at: new Date().toISOString(),
      })
      if (leadError) {
        throw new Error(`Não foi possível registrar o protocolo: ${leadError.message}`)
      }

      navigate('/minha-area?status=permuta', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar o acesso.')
      setStep('form')
    }
  }

  return (
    <div className="relative min-h-screen bg-se-mist">
      <NeuralBackground className="opacity-20 fixed inset-0" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <button onClick={() => navigate('/')} className="transition hover:opacity-70">
          <Logo size="md" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/minha-area')}
            className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs font-medium text-ink-soft backdrop-blur transition hover:border-se-violet/30 hover:text-ink"
          >
            <User className="h-3.5 w-3.5" />
            Minha área
          </button>
          <button
            onClick={() => navigate('/protocolo')}
            className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs font-medium text-ink-soft backdrop-blur transition hover:border-se-violet/30 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 pb-20 pt-4 md:pt-10">
        {step === 'intro' && (
          <div className="w-full text-center animate-fade-up">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-se-violet/20 bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-se-violet backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Acesso especial
            </div>
            <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">
              Seu protocolo começa aqui.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
              Este acesso foi preparado para quem vai combinar o pagamento do
              protocolo diretamente com a analista, por permuta ou em dinheiro.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-ink-muted">
              Você responderá algumas perguntas para indicarmos a modalidade mais
              adequada e, em seguida, criará seu ambiente pessoal — sem necessidade
              de pagamento online.
            </p>
            <button onClick={() => { setStep('quiz'); setCurrentQuestion(0); setAnswers([null, null, null, null, null]) }} className="btn-primary mt-8 group">
              Iniciar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}

        {step === 'quiz' && (
          <div className="card w-full max-w-lg animate-fade-up">
            <div className="mb-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                Um olhar sobre o seu momento
              </div>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                {QUESTIONS[currentQuestion].title}
              </h3>
              <p className="mt-1 text-xs text-ink-muted">5 perguntas • aproximadamente 1 minuto</p>
            </div>

            <div className="mb-6">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-se-lavender">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-se-teal to-se-violet transition-all duration-500"
                  style={{ width: `${((currentQuestion + 1) / 5) * 100}%` }}
                />
              </div>
            </div>

            <p className="mb-5 text-sm font-medium leading-relaxed text-ink">
              {QUESTIONS[currentQuestion].question}
            </p>

            <div className="space-y-2">
              {QUESTIONS[currentQuestion].options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                    answers[currentQuestion] === opt.value
                      ? 'border-se-violet bg-se-lavender text-ink'
                      : 'border-ink/10 bg-white text-ink-soft hover:border-se-violet/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                className="flex items-center gap-1 text-sm text-ink-muted transition hover:text-ink disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" /> Anterior
              </button>
              <button
                onClick={handleNext}
                disabled={answers[currentQuestion] === null}
                className="btn-primary px-6 py-2.5 text-sm disabled:opacity-40"
              >
                {currentQuestion === 4 ? 'Ver resultado' : 'Próxima'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="card w-full max-w-lg text-center animate-fade-up">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
              Sua indicação SynaptEssence360®
            </div>

            {recommendation === 'social' && (
              <>
                <div className="mt-5 inline-block rounded-full bg-se-teal/10 px-5 py-2 text-sm font-semibold text-se-teal">
                  Modalidade Social
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  Pelo que você compartilhou, a Modalidade Social parece oferecer uma
                  estrutura adequada para o momento que está vivendo.
                </p>
              </>
            )}
            {recommendation === 'transition' && (
              <>
                <div className="mt-5 inline-block rounded-full bg-se-lavender px-5 py-2 text-sm font-semibold text-se-violet">
                  Você está em uma zona de transição
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  Suas respostas indicam um processo que pode se beneficiar tanto de uma
                  estrutura regular quanto de um acompanhamento mais próximo.
                </p>
              </>
            )}
            {recommendation === 'integral' && (
              <>
                <div className="mt-5 inline-block rounded-full bg-se-violet/10 px-5 py-2 text-sm font-semibold text-se-violet">
                  Protocolo Integral de Reconstrução
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  Pelas características do momento que você descreveu, o Protocolo
                  Integral parece fazer mais sentido para sua jornada atual.
                </p>
              </>
            )}

            <p className="mt-4 text-xs italic text-ink-muted">
              A escolha não deve começar pelo preço. Deve começar pelo que o seu momento exige.
            </p>

            <button onClick={goToChoose} className="btn-primary mt-6 w-full">
              Continuar para escolher meu protocolo
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 'choose' && (
          <div className="w-full animate-fade-up">
            <div className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                Escolha sua modalidade
              </div>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">
                Qual modalidade de acompanhamento faz sentido para você?
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {(['social', 'integral'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModality(m)}
                  className={`card relative p-6 text-left transition-all ${
                    modality === m ? 'border-se-violet bg-se-lavender/30 ring-2 ring-se-violet' : 'border-ink/10'
                  }`}
                >
                  <h3 className="font-display text-lg font-semibold text-ink">{MODALITY_LABELS[m]}</h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    {m === 'social'
                      ? '12 encontros • metodologia completa • reavaliação final'
                      : 'Tudo da Social + acompanhamento estratégico, suporte via WhatsApp e caderno de regeneração.'}
                  </p>
                  <div className="mt-4 space-y-1 text-sm text-ink-soft">
                    <p>Plano mensal: <strong className="text-ink">R${fmtPrice(m === 'social' ? settings.payment_social_monthly : settings.payment_integral_monthly)}</strong></p>
                    <p>Plano completo: <strong className="text-ink">R${fmtPrice(m === 'social' ? settings.payment_social_complete : settings.payment_integral_complete)}</strong></p>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-se-violet">
                    <span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${modality === m ? 'border-se-violet' : 'border-ink/20'}`}>
                      {modality === m && <span className="h-2 w-2 rounded-full bg-se-violet" />}
                    </span>
                    Selecionar
                  </div>
                </button>
              ))}
            </div>

            <div className="card mt-4 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Plano</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(['mensal', 'completo'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlan(p)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                      plan === p ? 'border-se-violet bg-se-lavender/40' : 'border-ink/10 bg-white hover:border-se-violet/30'
                    }`}
                  >
                    <span className={`font-semibold ${plan === p ? 'text-se-violet-dark' : 'text-ink'}`}>
                      {p === 'mensal' ? 'Plano mensal' : 'Plano completo'}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {p === 'mensal' ? '1 mês de acompanhamento' : '3 meses • valor completo'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={goToForm} className="btn-primary mt-6 w-full">
              Criar meu acesso
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 'form' && (
          <div className="w-full max-w-lg animate-fade-up">
            <div className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                Criar meu ambiente
              </div>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">
                Seus dados e acesso
              </h2>
              <p className="mt-3 text-sm text-ink-soft">
                Comece o levantamento no seu ambiente após criar o acesso. Nenhum
                pagamento será solicitado online.
              </p>
            </div>

            <div className="card mt-8 p-6 md:p-8">
              <div className="rounded-2xl border border-se-violet/15 bg-se-lavender/40 p-4 text-sm text-ink-soft">
                <div className="text-xs font-semibold uppercase tracking-wide text-se-violet">
                  Resumo da escolha
                </div>
                <div className="mt-2 font-medium text-ink">
                  {MODALITY_LABELS[modality]} • {plan === 'mensal' ? 'Plano mensal' : 'Plano completo'}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-se-violet">
                  <Sparkles className="h-3.5 w-3.5" />
                  Pagamento combinado: Permuta / Dinheiro
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="permuta-name">Nome completo</label>
                  <input
                    id="permuta-name"
                    type="text"
                    className="input"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Seu nome completo"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="permuta-email">E-mail</label>
                  <input
                    id="permuta-email"
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="permuta-phone">WhatsApp / Telefone</label>
                  <input
                    id="permuta-phone"
                    type="tel"
                    className="input"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="permuta-password">Senha de acesso</label>
                  <input
                    id="permuta-password"
                    type="password"
                    className="input"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-xs text-ink-muted">
                    Você usará esta senha para acessar sua área pessoal e realizar o levantamento.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreateAccess}
                className="btn-primary mt-6 w-full"
              >
                Criar acesso
                <Lock className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="card w-full max-w-md p-8 text-center animate-fade-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-se-lavender">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
            </div>
            <h2 className="mt-6 font-display text-xl font-semibold text-ink">
              Criando seu ambiente…
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Aguarde enquanto preparamos sua área pessoal.
            </p>
          </div>
        )}

        {step === 'error' && (
          <div className="card w-full max-w-md p-8 text-center animate-fade-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="mt-6 font-display text-xl font-semibold text-ink">
              Houve um problema
            </h2>
            <p className="mt-2 text-sm text-ink-soft">{error || 'Não foi possível criar o acesso. Tente novamente.'}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep('form')} className="btn-secondary flex-1">
                Tentar novamente
              </button>
              <button onClick={() => navigate('/protocolo')} className="btn-primary flex-1">
                Voltar
              </button>
            </div>
          </div>
        )}

        {step !== 'intro' && (
          <div className="mt-8 flex items-center gap-1.5 text-[11px] text-ink-muted">
            <Check className="h-3.5 w-3.5" />
            Sem pagamento online — o valor será combinado com a analista.
          </div>
        )}
      </main>

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