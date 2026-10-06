import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Check, Brain, Heart, Sparkles, Flame, Zap, Sun, ChevronDown, User, Mail } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'
import { useSettings } from '../../context/SettingsContext'
import { track } from '../../lib/tracking'

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

// ─── Body Cards Data ────────────────────────────────────────────────────────

const BODIES = [
  { icon: Flame, title: 'Corpo Somático', description: 'Memórias, tensões e registros emocionais inscritos no corpo físico. A forma como habitamos e expressamos quem somos.' },
  { icon: Brain, title: 'Corpo Neurobiológico', description: 'Padrões neurais, hábitos emocionais e conexões que estruturam nossa forma de sentir, decidir e agir.' },
  { icon: Zap, title: 'Corpo Mental', description: 'Crenças, narrativas internas e modelos de pensamento que constroem a percepção de identidade e realidade.' },
  { icon: Heart, title: 'Corpo Emocional', description: 'Vínculos afetivos, feridas relacionais e a capacidade de sustentar presença, intimidade e vulnerabilidade.' },
  { icon: Sparkles, title: 'Corpo Energético', description: 'Vitalidade, ritmo interno, capacidade de regeneração e a qualidade da energia que sustenta o cotidiano.' },
  { icon: Sun, title: 'Corpo Essencial', description: 'Propósito, coerência, expressão autêntica e a manifestação do que há de mais genuíno em cada pessoa.' },
]

// ─── Component ──────────────────────────────────────────────────────────────

function fmtPrice(value?: string) {
  const n = parseFloat(value || '0')
  if (isNaN(n) || n <= 0) return '0,00'
  return n.toFixed(2).replace('.', ',')
}

const EMAIL_STEP_KEY = 'synapt_diag_email_step' // 'done' = já viu a etapa de e-mail

function emailStepDone(): boolean {
  try {
    return localStorage.getItem(EMAIL_STEP_KEY) === 'done'
  } catch {
    return false
  }
}

function markEmailStepDone() {
  try {
    localStorage.setItem(EMAIL_STEP_KEY, 'done')
  } catch {
    // storage indisponível — a etapa aparece de novo, sem quebrar nada
  }
}

export function Protocol() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { settings } = useSettings()
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [showEmailStep, setShowEmailStep] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [emailError, setEmailError] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null, null, null])
  const [showResult, setShowResult] = useState(false)
  const [recommendation, setRecommendation] = useState<'social' | 'transition' | 'integral'>('social')
  const [committed, setCommitted] = useState(false)
  const [highlightedCard, setHighlightedCard] = useState<'social' | 'integral' | null>(null)
  const modalitiesRef = useRef<HTMLDivElement>(null)

  function goToPayment(modality: 'social' | 'integral', plano: 'mensal' | 'completo') {
    track('payment_click', { detail: { modality, plan: plano } })
    navigate(`/pagamento?modalidade=${modality}&plano=${plano}`)
  }

  /** Abre o diagnóstico: mostra a etapa de e-mail (uma vez por visitante) antes das perguntas. */
  function openDiagnostic() {
    setCurrentQuestion(0)
    setAnswers([null, null, null, null, null])
    setShowResult(false)
    setEmailError('')
    const skipEmail = emailStepDone()
    setShowEmailStep(!skipEmail)
    setShowDiagnostic(true)
    track('diagnostic_start', { detail: { email_step: !skipEmail } })
  }

  function startQuestions() {
    setShowEmailStep(false)
    setEmailError('')
  }

  function handleEmailContinue() {
    const email = emailValue.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setEmailError('Informe um e-mail válido para receber sua análise.')
      return
    }
    track('email_capture', { detail: { email } })
    markEmailStepDone()
    startQuestions()
  }

  function handleEmailSkip() {
    track('diagnostic_skip_email')
    markEmailStepDone()
    startQuestions()
  }

  function closeDiagnostic() {
    if (!showResult && currentQuestion >= 0 && answers.some((a) => a !== null)) {
      track('diagnostic_abandon', {
        detail: { at_question: currentQuestion + 1, answered: answers.filter((a) => a !== null).length },
      })
    }
    setShowDiagnostic(false)
    setShowEmailStep(false)
  }

  function calculateRecommendation() {
    const score = answers.reduce<number>((sum, a) => sum + (a ?? 0), 0)
    if (score <= 10) return 'social'
    if (score <= 15) return 'transition'
    return 'integral'
  }

  function handleAnswer(value: number) {
    const newAnswers = [...answers]
    newAnswers[currentQuestion] = value
    setAnswers(newAnswers)
    track('diagnostic_answer', {
      detail: { question: currentQuestion + 1, value },
    })
  }

  function handleNext() {
    if (currentQuestion < 4) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      const rec = calculateRecommendation()
      setRecommendation(rec)
      setShowResult(true)
      track('diagnostic_result', {
        detail: { recommendation: rec, score: answers.reduce<number>((sum, a) => sum + (a ?? 0), 0) },
      })
    }
  }

  function handlePrev() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  function scrollToModalities(card: 'social' | 'integral') {
    setShowDiagnostic(false)
    setShowResult(false)
    setHighlightedCard(card)
    setTimeout(() => {
      modalitiesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // Abre o diagnóstico de momento quando acionado a partir de "Iniciar levantamento"
  useEffect(() => {
    if (searchParams.get('diagnostico') === '1') {
      openDiagnostic()
    }
  }, [searchParams])

  // Scroll para seção quando a Landing navega com hash (ex.: /protocolo#como-funciona)
  useEffect(() => {
    function scrollToHash() {
      const id = window.location.hash.replace('#', '')
      if (!id) return
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    const t = setTimeout(scrollToHash, 200)
    window.addEventListener('hashchange', scrollToHash)
    return () => { clearTimeout(t); window.removeEventListener('hashchange', scrollToHash) }
  }, [])

  // Animate on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-up')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative min-h-screen bg-se-mist">
      <NeuralBackground className="opacity-20 fixed inset-0" />

      {/* ─── HEADER ─── */}
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
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs font-medium text-ink-soft backdrop-blur transition hover:border-se-violet/30 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative z-10 px-6 pb-20 pt-12 text-center md:pb-28 md:pt-20">
        <div className="mx-auto max-w-3xl" data-animate>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-se-violet/20 bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-se-violet backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-se-teal animate-pulse-dot" />
            Jornada de 90 dias
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-ink md:text-5xl">
            Protocolo de Resgate de Identidade
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
            90 dias para reconstruir novas conexões entre quem você é, o que vive e o que escolhe manifestar.
          </p>
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-se-violet/10 bg-white/60 px-8 py-5 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-ink-soft">
              Não é um pacote de sessões.<br />
              É um processo estruturado para transformar autoconhecimento em identidade, posicionamento e coerência.
            </p>
          </div>
          <button
            onClick={() => modalitiesRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-primary mt-10 group"
          >
            Quero iniciar meu protocolo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section id="como-funciona" className="relative z-10 bg-white/50 px-6 py-20 backdrop-blur-sm md:py-28">
        <div className="mx-auto max-w-4xl" data-animate>
          <h2 className="text-center font-display text-2xl font-semibold text-ink md:text-4xl">
            Como funciona
          </h2>
          <div className="mx-auto mt-12 grid max-w-2xl gap-4 sm:grid-cols-2">
            {[
              '12 encontros',
              '1 encontro por semana',
              '90 dias',
              'Processo individual',
              'Metodologia SynaptEssence360®',
              'Exercícios entre sessões',
              'Plano de continuidade',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-ink/5 bg-white px-5 py-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-se-teal/10">
                  <Check className="h-3.5 w-3.5 text-se-teal" />
                </div>
                <span className="text-sm font-medium text-ink">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── POR QUE 90 DIAS ─── */}
      <section className="relative z-10 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl" data-animate>
          <div className="text-center">
            <h2 className="font-display text-2xl font-semibold text-ink md:text-4xl">
              Por que um protocolo de 90 dias?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft md:text-base">
              Transformação não acontece em encontros isolados. Novas conexões neurais, emocionais e comportamentais precisam de continuidade para serem consolidadas. O protocolo de 90 dias cria o ambiente necessário para que a mudança deixe de ser um insight e se torne uma nova forma de viver.
            </p>
          </div>
          <div className="mt-14 flex flex-col items-center gap-0">
            {['Semana 1', 'Compreensão', 'Integração', 'Reposicionamento', 'Expressão', 'Nova identidade'].map((step, i) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`rounded-full px-6 py-3 text-sm font-medium ${i === 5 ? 'bg-gradient-to-r from-se-teal to-se-violet text-white shadow-lift' : 'border border-se-violet/15 bg-white text-ink'}`}>
                  {step}
                </div>
                {i < 5 && (
                  <div className="flex h-8 items-center">
                    <ChevronDown className="h-4 w-4 text-se-violet/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── O QUE É TRABALHADO ─── */}
      <section className="relative z-10 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl" data-animate>
          <h2 className="text-center font-display text-2xl font-semibold text-ink md:text-4xl">
            O que é trabalhado
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BODIES.map((body) => (
              <div key={body.title} className="card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-se-lavender">
                  <body.icon className="h-5 w-5 text-se-violet" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{body.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PARA QUEM É ─── */}
      <section className="relative z-10 bg-white/50 px-6 py-20 backdrop-blur-sm md:py-28">
        <div className="mx-auto max-w-3xl text-center" data-animate>
          <h2 className="font-display text-2xl font-semibold text-ink md:text-4xl">
            Para quem é este protocolo
          </h2>
          <p className="mt-4 text-sm text-ink-soft md:text-base">
            Este protocolo foi desenvolvido para pessoas que:
          </p>
          <div className="mt-8 space-y-3 text-left">
            {[
              'sentem que perderam sua identidade;',
              'vivem relações desgastantes;',
              'desejam reconstruir a autoestima;',
              'precisam tomar decisões difíceis;',
              'querem fortalecer a família sem perder a própria essência;',
              'buscam coerência entre quem são e a forma como vivem.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl bg-white px-5 py-4 shadow-soft">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-se-violet" />
                <span className="text-sm leading-relaxed text-ink-soft">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DIAGNÓSTICO ─── */}
      <section className="relative z-10 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center" data-animate>
          <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">
            Descubra qual modalidade faz sentido para o seu momento
          </h2>
          <p className="mt-3 text-sm text-ink-muted">
            Responda 5 perguntas e receba uma orientação personalizada.
          </p>
          <button
            onClick={openDiagnostic}
            className="btn-primary mt-8 group"
          >
            Iniciar meu diagnóstico de momento
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {/* ─── MODALIDADES ─── */}
      <section ref={modalitiesRef} className="relative z-10 bg-white/50 px-6 py-20 backdrop-blur-sm md:py-28">
        <div className="mx-auto max-w-5xl" data-animate>
          <h2 className="text-center font-display text-2xl font-semibold text-ink md:text-4xl">
            Escolha sua modalidade de acompanhamento
          </h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* Modalidade Protocolo Essencial */}
            <div className={`card relative p-8 transition-all duration-500 ${highlightedCard === 'social' ? 'ring-2 ring-se-teal shadow-lift' : ''}`}>
              {highlightedCard === 'social' && (
                <div className="absolute -top-3 left-6 rounded-full bg-se-teal px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Indicada para o seu momento
                </div>
              )}
              <h3 className="font-display text-xl font-semibold text-ink">Modalidade Protocolo Essencial</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Uma jornada estruturada de 90 dias para reconstruir sua identidade,
                seu posicionamento e sua coerência. Não é um pacote de sessões — é
                um processo completo de transformação.
              </p>
              <div className="mt-6 space-y-2">
                {[
                  'Jornada completa de 90 dias',
                  '12 encontros individuais ao longo do processo',
                  'Aplicação integral da metodologia SynaptEssence360®',
                  'Exercícios de integração entre os encontros',
                  'Reavaliação e devolutiva ao final da jornada',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-se-teal" />
                    <span className="text-sm text-ink-soft">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-ink/5 pt-6">
                <div className="text-sm text-ink-muted">Investimento na jornada completa</div>
                <div className="font-display text-3xl font-semibold text-ink">
                  R${fmtPrice(settings.payment_social_complete)}
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  Protocolo completo de 90 dias. Parcelamento via Mercado Pago.
                </p>
              </div>
              <div className="mt-6">
                <button onClick={() => goToPayment('social', 'completo')} className="btn-primary w-full">
                  Iniciar minha jornada
                </button>
              </div>
            </div>

            {/* Protocolo Integral */}
            <div className={`card relative border-2 border-se-violet/20 p-8 transition-all duration-500 ${highlightedCard === 'integral' ? 'ring-2 ring-se-violet shadow-lift' : ''}`}>
              {highlightedCard === 'integral' && (
                <div className="absolute -top-3 left-6 rounded-full bg-se-violet px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Indicada para o seu momento
                </div>
              )}
              <div className="mb-3 inline-block rounded-full bg-se-lavender px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-se-violet">
                Recomendado para momentos decisivos da vida
              </div>
              <h3 className="font-display text-xl font-semibold text-ink">Modalidade Mentoria Integral</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Uma jornada de 90 dias com acompanhamento mais próximo, estratégico e
                personalizado. Para quem vive processos de reconstrução pessoal, familiar
                ou relacional e deseja uma mentoria dedicada em cada etapa. Não é um pacote
                de sessões — é um processo completo de transformação com mentoria.
              </p>
              <div className="mt-4 mb-2 text-xs font-medium uppercase tracking-wider text-se-violet">
                Inclui tudo do Protocolo Essencial e ainda:
              </div>
              <div className="space-y-2">
                {[
                  'Planejamento individual do protocolo',
                  'Acompanhamento estratégico durante os 90 dias',
                  'Suporte entre encontros via WhatsApp (horário comercial)',
                  'Exercícios personalizados',
                  'Ajustes individualizados conforme evolução',
                  'Direcionamento para momentos críticos',
                  'Leitura ampliada dos impactos familiares e sistêmicos',
                  'Construção do Plano de Continuidade',
                  'Prioridade na agenda',
                  'Caderno de Regeneração SynaptEssence360®',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-se-violet" />
                    <span className="text-sm text-ink-soft">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-ink/5 pt-6">
                <div className="text-sm text-ink-muted">Investimento na jornada completa</div>
                <div className="font-display text-3xl font-semibold text-ink">
                  R${fmtPrice(settings.payment_integral_complete)}
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  Mentoria completa de 90 dias. Parcelamento via Mercado Pago.
                </p>
              </div>
              <div className="mt-6">
                <button onClick={() => goToPayment('integral', 'completo')} className="btn-primary w-full">
                  Iniciar minha mentoria
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPARATIVO ─── */}
      <section className="relative z-10 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl" data-animate>
          <h2 className="text-center font-display text-2xl font-semibold text-ink md:text-4xl">
            Qual a diferença entre as duas modalidades?
          </h2>
          <div className="mt-10 rounded-3xl border border-ink/5 bg-white p-6 md:p-8">
            <p className="text-sm leading-relaxed text-ink-soft">
              A metodologia é exatamente a mesma e ambas são jornadas completas de 90 dias. O diferencial da Mentoria Integral está na <strong className="text-ink">profundidade do acompanhamento</strong>, personalização, suporte ao longo do processo e construção estratégica da jornada.
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/5">
                    <th className="pb-3 pr-4 font-medium text-ink-muted"></th>
                    <th className="pb-3 pr-4 font-medium text-ink">Essencial</th>
                    <th className="pb-3 font-medium text-se-violet">Mentoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {[
                    ['Metodologia SynaptEssence360®', true, true],
                    ['12 encontros individuais', true, true],
                    ['Exercícios entre encontros', true, true],
                    ['Planejamento individual', false, true],
                    ['Suporte via WhatsApp', false, true],
                    ['Ajustes personalizados', false, true],
                    ['Leitura sistêmica ampliada', false, true],
                    ['Caderno de Regeneração', false, true],
                    ['Prioridade na agenda', false, true],
                  ].map(([label, social, integral]) => (
                    <tr key={label as string}>
                      <td className="py-3 pr-4 text-ink-soft">{label as string}</td>
                      <td className="py-3 pr-4">{social ? <Check className="h-4 w-4 text-se-teal" /> : <span className="text-ink-muted">—</span>}</td>
                      <td className="py-3">{integral ? <Check className="h-4 w-4 text-se-violet" /> : <span className="text-ink-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPROMISSO ─── */}
      <section className="relative z-10 bg-white/50 px-6 py-20 backdrop-blur-sm md:py-28">
        <div className="mx-auto max-w-2xl text-center" data-animate>
          <h2 className="font-display text-2xl font-semibold text-ink md:text-4xl">
            Seu compromisso começa aqui.
          </h2>
          <div className="mx-auto mt-8 max-w-xl space-y-4 text-sm leading-relaxed text-ink-soft md:text-base">
            <p>Ao iniciar este protocolo, você não está adquirindo apenas encontros.</p>
            <p>Está assumindo um compromisso consigo mesmo.</p>
            <p className="font-medium text-ink">
              Resgatar identidade exige presença.<br />
              Escolhas.<br />
              Continuidade.<br />
              Coragem.
            </p>
            <p className="font-display text-lg italic text-se-violet">
              Toda transformação começa quando novas conexões são criadas.
            </p>
          </div>
          <label className="mt-8 inline-flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/10 bg-white px-6 py-4 text-left transition hover:border-se-violet/30">
            <input
              type="checkbox"
              checked={committed}
              onChange={(e) => setCommitted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-ink/20 text-se-violet focus:ring-se-violet/30"
            />
            <span className="text-xs leading-relaxed text-ink-soft md:text-sm">
              Declaro compreender que este protocolo é um processo de desenvolvimento construído ao longo de 90 dias e me comprometo a participar ativamente da minha jornada.
            </span>
          </label>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="relative z-10 px-6 py-20 text-center md:py-28">
        <div data-animate>
          <button
            onClick={() => modalitiesRef.current?.scrollIntoView({ behavior: 'smooth' })}
            disabled={!committed}
            className="btn-primary text-base md:text-lg px-10 py-5 disabled:opacity-40 disabled:pointer-events-none"
          >
            Quero iniciar meu Protocolo de Resgate de Identidade
            <ArrowRight className="h-5 w-5" />
          </button>
          {!committed && (
            <p className="mt-3 text-xs text-ink-muted">Marque a declaração de compromisso acima para continuar.</p>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 pb-10 text-center">
        <div className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          <p>A tecnologia organiza dados.</p>
          <p>A metodologia gera compreensão.</p>
          <p>O especialista conduz a transformação.</p>
        </div>
      </footer>

      {/* ─── DIAGNOSTIC MODAL ─── */}
      {showDiagnostic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 animate-fade-up">
            {showEmailStep ? (
              /* ─── ETAPA DE E-MAIL (antes das perguntas) ─── */
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-se-lavender">
                    <Mail className="h-5 w-5 text-se-violet" />
                  </div>
                  <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                    Antes de começarmos
                  </div>
                  <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                    Receba sua análise por e-mail
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    Informe seu e-mail e nós enviamos o resumo do seu momento e a
                    indicação personalizada — assim você não depende de salvar a página.
                  </p>
                </div>

                <label className="label" htmlFor="diag-email">
                  E-mail
                </label>
                <input
                  id="diag-email"
                  type="email"
                  className="input"
                  value={emailValue}
                  onChange={(e) => {
                    setEmailValue(e.target.value)
                    if (emailError) setEmailError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEmailContinue()
                  }}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  autoFocus
                />
                {emailError && (
                  <p className="mt-2 text-xs text-red-600">{emailError}</p>
                )}

                <button onClick={handleEmailContinue} className="btn-primary mt-5 w-full">
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={handleEmailSkip}
                  className="mt-4 w-full text-center text-xs text-ink-muted hover:text-ink"
                >
                  Continuar sem e-mail
                </button>
              </>
            ) : !showResult ? (
              <>
                {/* Header */}
                <div className="mb-6">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                    Um olhar sobre o seu momento
                  </div>
                  <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                    {QUESTIONS[currentQuestion].title}
                  </h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    5 perguntas • aproximadamente 1 minuto
                  </p>
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    <span>{currentQuestion + 1} de 5</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-se-lavender">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-se-teal to-se-violet transition-all duration-500"
                      style={{ width: `${((currentQuestion + 1) / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question */}
                <p className="mb-5 text-sm font-medium leading-relaxed text-ink">
                  {QUESTIONS[currentQuestion].question}
                </p>

                <p className="mb-4 text-[11px] italic text-ink-muted">
                  Não existe resposta certa. Existe a resposta que representa melhor o seu momento.
                </p>

                {/* Options */}
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

                {/* Navigation */}
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
                    className="btn-primary py-2.5 px-6 text-sm disabled:opacity-40"
                  >
                    {currentQuestion === 4 ? 'Ver resultado' : 'Próxima'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Close */}
                <button
                  onClick={closeDiagnostic}
                  className="mt-4 w-full text-center text-xs text-ink-muted hover:text-ink"
                >
                  Fechar
                </button>
              </>
            ) : (
              /* ─── RESULT ─── */
              <div className="text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                  Seu momento pede um percurso
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink">
                  Sua indicação SynaptEssence360®
                </h3>

                {recommendation === 'social' && (
                  <div className="mt-6">
                    <div className="inline-block rounded-full bg-se-teal/10 px-5 py-2 text-sm font-semibold text-se-teal">
                      Modalidade Protocolo Essencial
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                      Pelo que você compartilhou, o Protocolo Essencial parece oferecer a estrutura adequada para a jornada que está vivendo.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      Ela proporciona o acompanhamento necessário para desenvolver consciência, novas perspectivas e práticas de transformação ao longo dos 90 dias, com a metodologia SynaptEssence360®.
                    </p>
                    <button onClick={() => scrollToModalities('social')} className="btn-primary mt-6">
                      Conhecer o Protocolo Essencial <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {recommendation === 'transition' && (
                  <div className="mt-6">
                    <div className="inline-block rounded-full bg-se-lavender px-5 py-2 text-sm font-semibold text-se-violet">
                      Você está em uma zona de transição
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                      Suas respostas indicam que você está vivendo um processo que pode se beneficiar tanto de uma estrutura regular quanto de um acompanhamento mais próximo.
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <button onClick={() => scrollToModalities('social')} className="btn-secondary text-sm py-3">
                        Ver Protocolo Essencial
                      </button>
                      <button onClick={() => scrollToModalities('integral')} className="btn-primary text-sm py-3">
                        Conhecer Mentoria Integral
                      </button>
                    </div>
                  </div>
                )}

                {recommendation === 'integral' && (
                  <div className="mt-6">
                    <div className="inline-block rounded-full bg-se-violet/10 px-5 py-2 text-sm font-semibold text-se-violet">
                      Modalidade Mentoria Integral
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                      Pelas características do momento que você descreveu, a Mentoria Integral parece fazer mais sentido para sua jornada atual.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      Suas respostas indicam um momento que pode se beneficiar de maior proximidade, personalização e suporte estratégico durante os 90 dias.
                    </p>
                    <button onClick={() => scrollToModalities('integral')} className="btn-primary mt-6">
                      Conhecer minha recomendação <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Why this modality */}
                <div className="mt-8 border-t border-ink/5 pt-6 text-left">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Por que essa modalidade?
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    Sua indicação considera principalmente os aspectos identificados nas suas respostas:
                  </p>
                  <div className="mt-4 space-y-3">
                    {answers[1] !== null && (answers[1] ?? 0) >= 3 && (
                      <div>
                        <div className="text-xs font-semibold text-se-violet">Identidade</div>
                        <p className="text-xs text-ink-muted">Necessidade de ampliar clareza sobre quem você é e como deseja se posicionar.</p>
                      </div>
                    )}
                    {answers[2] !== null && (answers[2] ?? 0) >= 3 && (
                      <div>
                        <div className="text-xs font-semibold text-se-violet">Contexto relacional</div>
                        <p className="text-xs text-ink-muted">Presença de relações ou sistemas que influenciam seu processo de mudança.</p>
                      </div>
                    )}
                    {answers[3] !== null && (answers[3] ?? 0) >= 3 && (
                      <div>
                        <div className="text-xs font-semibold text-se-violet">Sustentação da mudança</div>
                        <p className="text-xs text-ink-muted">Necessidade de continuidade e acompanhamento para transformar compreensão em ação.</p>
                      </div>
                    )}
                    {answers[0] !== null && (answers[0] ?? 0) >= 3 && (
                      <div>
                        <div className="text-xs font-semibold text-se-violet">Intensidade do momento</div>
                        <p className="text-xs text-ink-muted">Você está atravessando uma fase que pede profundidade e estrutura.</p>
                      </div>
                    )}
                    {answers[4] !== null && (answers[4] ?? 0) >= 3 && (
                      <div>
                        <div className="text-xs font-semibold text-se-violet">Decisões importantes</div>
                        <p className="text-xs text-ink-muted">Momento que envolve escolhas significativas para sua vida.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-ink/5 pt-6">
                  <p className="text-xs italic text-ink-muted">
                    A escolha não deve começar pelo preço. Deve começar pelo que o seu momento exige.
                  </p>
                </div>

                <button
                  onClick={closeDiagnostic}
                  className="mt-4 text-xs text-ink-muted hover:text-ink"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
