import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Check, Brain, Heart, Sparkles, Flame, Zap, Sun, ChevronDown } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'
import { supabase } from '../../lib/supabase'

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

export function Protocol() {
  const navigate = useNavigate()
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null, null, null])
  const [showResult, setShowResult] = useState(false)
  const [recommendation, setRecommendation] = useState<'social' | 'transition' | 'integral'>('social')
  const [committed, setCommitted] = useState(false)
  const [highlightedCard, setHighlightedCard] = useState<'social' | 'integral' | null>(null)
  const [showContact, setShowContact] = useState(false)
  const [selectedModality, setSelectedModality] = useState<'social' | 'integral'>('social')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactSent, setContactSent] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)
  const modalitiesRef = useRef<HTMLDivElement>(null)

  function openContactModal(modality: 'social' | 'integral') {
    setSelectedModality(modality)
    setContactName('')
    setContactPhone('')
    setContactSent(false)
    setShowContact(true)
  }

  async function handleContactSubmit() {
    if (!contactName.trim() || !contactPhone.trim()) return
    setContactLoading(true)
    try {
      await supabase.from('protocol_leads').insert({
        name: contactName.trim(),
        phone: contactPhone.trim(),
        modality: selectedModality,
        created_at: new Date().toISOString(),
      })
    } catch {
      // silently continue even if supabase is not configured
    }
    setContactLoading(false)
    setContactSent(true)
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
  }

  function handleNext() {
    if (currentQuestion < 4) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      const rec = calculateRecommendation()
      setRecommendation(rec)
      setShowResult(true)
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
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs font-medium text-ink-soft backdrop-blur transition hover:border-se-violet/30 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
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

      {/* ─── COMO FUNCIONA ─── */}
      <section className="relative z-10 bg-white/50 px-6 py-20 backdrop-blur-sm md:py-28">
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
            onClick={() => { setShowDiagnostic(true); setCurrentQuestion(0); setAnswers([null, null, null, null, null]); setShowResult(false) }}
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
            {/* Modalidade Social */}
            <div className={`card relative p-8 transition-all duration-500 ${highlightedCard === 'social' ? 'ring-2 ring-se-teal shadow-lift' : ''}`}>
              {highlightedCard === 'social' && (
                <div className="absolute -top-3 left-6 rounded-full bg-se-teal px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Indicada para o seu momento
                </div>
              )}
              <h3 className="font-display text-xl font-semibold text-ink">Modalidade Social</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Criada para ampliar o acesso ao Protocolo de Resgate de Identidade.
              </p>
              <div className="mt-6 space-y-2">
                {[
                  '12 encontros individuais',
                  '1 encontro semanal',
                  'Aplicação completa da metodologia SynaptEssence360®',
                  'Exercícios entre encontros',
                  'Reavaliação ao final do processo',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-se-teal" />
                    <span className="text-sm text-ink-soft">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-ink/5 pt-6">
                <div className="text-sm text-ink-muted">Valor por encontro</div>
                <div className="font-display text-2xl font-semibold text-ink">R$150</div>
                <div className="mt-2 space-y-1 text-sm text-ink-soft">
                  <p>Plano mensal: <strong className="text-ink">R$600</strong></p>
                  <p>Plano completo: <strong className="text-ink">R$1.800</strong></p>
                  <p className="text-xs text-ink-muted">Parcelamento em até 10x com juros da operadora.</p>
                </div>
              </div>
              <button onClick={() => openContactModal('social')} className="btn-secondary mt-6 w-full">
                Quero iniciar nesta modalidade
              </button>
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
              <h3 className="font-display text-xl font-semibold text-ink">Protocolo Integral de Reconstrução</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Destinado às pessoas que vivem processos de reconstrução pessoal, familiar ou relacional e desejam um acompanhamento mais próximo, estratégico e personalizado durante os 90 dias.
              </p>
              <div className="mt-4 mb-2 text-xs font-medium uppercase tracking-wider text-se-violet">
                Inclui tudo da Modalidade Social e ainda:
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
                <div className="text-sm text-ink-muted">Valor por encontro</div>
                <div className="font-display text-2xl font-semibold text-ink">R$350</div>
                <div className="mt-2 space-y-1 text-sm text-ink-soft">
                  <p>Plano mensal: <strong className="text-ink">R$1.400</strong></p>
                  <p>Plano completo: <strong className="text-ink">R$4.200</strong></p>
                  <p className="text-xs text-ink-muted">Parcelamento em até 10x com juros da operadora.</p>
                </div>
              </div>
              <button onClick={() => openContactModal('integral')} className="btn-primary mt-6 w-full">
                Quero viver o Protocolo Integral
                <ArrowRight className="h-4 w-4" />
              </button>
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
              A metodologia é exatamente a mesma. Os encontros possuem a mesma duração. O diferencial da modalidade Integral está na <strong className="text-ink">profundidade do acompanhamento</strong>, personalização, suporte entre sessões e construção estratégica do processo.
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/5">
                    <th className="pb-3 pr-4 font-medium text-ink-muted"></th>
                    <th className="pb-3 pr-4 font-medium text-ink">Social</th>
                    <th className="pb-3 font-medium text-se-violet">Integral</th>
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

      {/* ─── CONTACT MODAL ─── */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md p-8 animate-fade-up">
            {!contactSent ? (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                  {selectedModality === 'social' ? 'Modalidade Social' : 'Protocolo Integral de Reconstrução'}
                </div>
                <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                  Vamos começar sua jornada
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Deixe seu nome e telefone. Entraremos em contato para alinhar os próximos passos e enviar o link de pagamento.
                </p>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="label" htmlFor="contactName">Nome completo</label>
                    <input
                      id="contactName"
                      type="text"
                      className="input"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="contactPhone">WhatsApp / Telefone</label>
                    <input
                      id="contactPhone"
                      type="tel"
                      className="input"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleContactSubmit()}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <button
                  onClick={handleContactSubmit}
                  disabled={!contactName.trim() || !contactPhone.trim() || contactLoading}
                  className="btn-primary mt-6 w-full"
                >
                  {contactLoading ? 'Enviando...' : 'Confirmar interesse'}
                  {!contactLoading && <ArrowRight className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setShowContact(false)}
                  className="mt-3 w-full text-center text-xs text-ink-muted hover:text-ink"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-se-teal/10">
                  <Check className="h-7 w-7 text-se-teal" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink">
                  Recebemos seu interesse!
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Em breve entraremos em contato pelo número informado para alinhar os detalhes e enviar o link de pagamento da{' '}
                  <strong className="text-ink">
                    {selectedModality === 'social' ? 'Modalidade Social' : 'Protocolo Integral de Reconstrução'}
                  </strong>.
                </p>
                <p className="mt-4 font-display text-sm italic text-se-violet">
                  Toda transformação começa quando novas conexões são criadas.
                </p>
                <button
                  onClick={() => setShowContact(false)}
                  className="btn-secondary mt-6"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DIAGNOSTIC MODAL ─── */}
      {showDiagnostic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 animate-fade-up">
            {!showResult ? (
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
                  onClick={() => setShowDiagnostic(false)}
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
                      Modalidade Social
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                      Pelo que você compartilhou, a Modalidade Social parece oferecer uma estrutura adequada para o momento que está vivendo.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      Ela proporciona o acompanhamento necessário para desenvolver consciência, novas perspectivas e práticas de transformação ao longo dos 90 dias, com a metodologia SynaptEssence360®.
                    </p>
                    <button onClick={() => scrollToModalities('social')} className="btn-primary mt-6">
                      Conhecer a Modalidade Social <ArrowRight className="h-4 w-4" />
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
                        Ver Modalidade Social
                      </button>
                      <button onClick={() => scrollToModalities('integral')} className="btn-primary text-sm py-3">
                        Conhecer Protocolo Integral
                      </button>
                    </div>
                  </div>
                )}

                {recommendation === 'integral' && (
                  <div className="mt-6">
                    <div className="inline-block rounded-full bg-se-violet/10 px-5 py-2 text-sm font-semibold text-se-violet">
                      Protocolo Integral de Reconstrução
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                      Pelas características do momento que você descreveu, o Protocolo Integral de Reconstrução parece fazer mais sentido para sua jornada atual.
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
                  onClick={() => setShowDiagnostic(false)}
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
