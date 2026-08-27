import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Check, Brain, Heart, Sparkles, Flame, Zap, Sun, ChevronDown } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'

// ─── Diagnostic Questions ───────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 1,
    title: 'Momento Atual',
    question: 'Como voc\u00ea descreveria o momento que est\u00e1 vivendo hoje?',
    options: [
      { label: 'Estou buscando me conhecer melhor e fazer ajustes na minha vida.', value: 1 },
      { label: 'Sinto que preciso mudar algumas \u00e1reas importantes da minha vida.', value: 2 },
      { label: 'Estou atravessando uma fase de mudan\u00e7as profundas e preciso me reorganizar.', value: 3 },
      { label: 'Estou vivendo um momento decisivo e sinto necessidade de reconstruir minha forma de viver, me posicionar e me relacionar.', value: 4 },
    ],
  },
  {
    id: 2,
    title: 'Identidade e Posicionamento',
    question: 'Quando pensa em quem voc\u00ea \u00e9 e no que realmente deseja, o que mais representa seu momento atual?',
    options: [
      { label: 'Tenho clareza sobre quem sou, mas quero evoluir.', value: 1 },
      { label: 'Sei algumas coisas que quero, mas ainda tenho d\u00favidas importantes.', value: 2 },
      { label: 'Sinto dificuldade para reconhecer o que realmente quero e quem estou me tornando.', value: 3 },
      { label: 'Sinto que me desconectei de mim e preciso reconstruir minha identidade e meu posicionamento.', value: 4 },
    ],
  },
  {
    id: 3,
    title: 'Rela\u00e7\u00f5es e Sistema',
    question: 'Quanto o seu momento atual est\u00e1 relacionado \u00e0s suas rela\u00e7\u00f5es, fam\u00edlia ou ambiente em que vive?',
    options: [
      { label: 'Pouco. Minha principal quest\u00e3o \u00e9 individual.', value: 1 },
      { label: 'Existe algum impacto nas minhas rela\u00e7\u00f5es, mas consigo lidar com isso.', value: 2 },
      { label: 'Minhas rela\u00e7\u00f5es influenciam diretamente minhas decis\u00f5es e meu processo de mudan\u00e7a.', value: 3 },
      { label: 'Estou vivendo quest\u00f5es relacionais ou familiares importantes que precisam ser consideradas no meu processo de reconstru\u00e7\u00e3o.', value: 4 },
    ],
  },
  {
    id: 4,
    title: 'Necessidade de Acompanhamento',
    question: 'O que voc\u00ea acredita que mais ajudaria durante os pr\u00f3ximos 90 dias?',
    options: [
      { label: 'Ter encontros estruturados para refletir e desenvolver novas perspectivas.', value: 1 },
      { label: 'Ter um processo organizado que me ajude a transformar compreens\u00e3o em a\u00e7\u00e3o.', value: 2 },
      { label: 'Ter acompanhamento mais pr\u00f3ximo para sustentar mudan\u00e7as e ajustar meu percurso.', value: 3 },
      { label: 'Ter orienta\u00e7\u00e3o estrat\u00e9gica e suporte ao longo do processo, especialmente diante de situa\u00e7\u00f5es que podem surgir entre os encontros.', value: 4 },
    ],
  },
  {
    id: 5,
    title: 'Momento Decisivo',
    question: 'Qual destas situa\u00e7\u00f5es mais se aproxima do que voc\u00ea est\u00e1 vivendo hoje?',
    options: [
      { label: 'Quero iniciar uma fase de desenvolvimento pessoal com mais consci\u00eancia.', value: 1 },
      { label: 'Quero mudar padr\u00f5es e construir uma forma mais coerente de viver.', value: 2 },
      { label: 'Estou diante de decis\u00f5es ou mudan\u00e7as relevantes e quero apoio para atravess\u00e1-las.', value: 3 },
      { label: 'Estou reconstruindo uma parte importante da minha vida e preciso de um acompanhamento mais pr\u00f3ximo, personalizado e estrat\u00e9gico.', value: 4 },
    ],
  },
]

// ─── Body Cards Data ────────────────────────────────────────────────────────

const BODIES = [
  { icon: Flame, title: 'Corpo Som\u00e1tico', description: 'Mem\u00f3rias, tens\u00f5es e registros emocionais inscritos no corpo f\u00edsico. A forma como habitamos e expressamos quem somos.' },
  { icon: Brain, title: 'Corpo Neurobiol\u00f3gico', description: 'Padr\u00f5es neurais, h\u00e1bitos emocionais e conex\u00f5es que estruturam nossa forma de sentir, decidir e agir.' },
  { icon: Zap, title: 'Corpo Mental', description: 'Cren\u00e7as, narrativas internas e modelos de pensamento que constroem a percep\u00e7\u00e3o de identidade e realidade.' },
  { icon: Heart, title: 'Corpo Emocional', description: 'V\u00ednculos afetivos, feridas relacionais e a capacidade de sustentar presen\u00e7a, intimidade e vulnerabilidade.' },
  { icon: Sparkles, title: 'Corpo Energ\u00e9tico', description: 'Vitalidade, ritmo interno, capacidade de regenera\u00e7\u00e3o e a qualidade da energia que sustenta o cotidiano.' },
  { icon: Sun, title: 'Corpo Essencial', description: 'Prop\u00f3sito, coer\u00eancia, express\u00e3o aut\u00eantica e a manifesta\u00e7\u00e3o do que h\u00e1 de mais genu\u00edno em cada pessoa.' },
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
  const modalitiesRef = useRef<HTMLDivElement>(null)

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
            90 dias para reconstruir novas conex\u00f5es entre quem voc\u00ea \u00e9, o que vive e o que escolhe manifestar.
          </p>
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-se-violet/10 bg-white/60 px-8 py-5 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-ink-soft">
              N\u00e3o \u00e9 um pacote de sess\u00f5es.<br />
              \u00c9 um processo estruturado para transformar autoconhecimento em identidade, posicionamento e coer\u00eancia.
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
              Transforma\u00e7\u00e3o n\u00e3o acontece em encontros isolados. Novas conex\u00f5es neurais, emocionais e comportamentais precisam de continuidade para serem consolidadas. O protocolo de 90 dias cria o ambiente necess\u00e1rio para que a mudan\u00e7a deixe de ser um insight e se torne uma nova forma de viver.
            </p>
          </div>
          <div className="mt-14 flex flex-col items-center gap-0">
            {['Semana 1', 'Compreens\u00e3o', 'Integra\u00e7\u00e3o', 'Reposicionamento', 'Express\u00e3o', 'Nova identidade'].map((step, i) => (
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
              'Metodologia SynaptEssence360\u00ae',
              'Exerc\u00edcios entre sess\u00f5es',
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

      {/* ─── O QUE \u00c9 TRABALHADO ─── */}
      <section className="relative z-10 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl" data-animate>
          <h2 className="text-center font-display text-2xl font-semibold text-ink md:text-4xl">
            O que \u00e9 trabalhado
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

      {/* ─── PARA QUEM \u00c9 ─── */}
      <section className="relative z-10 bg-white/50 px-6 py-20 backdrop-blur-sm md:py-28">
        <div className="mx-auto max-w-3xl text-center" data-animate>
          <h2 className="font-display text-2xl font-semibold text-ink md:text-4xl">
            Para quem \u00e9 este protocolo
          </h2>
          <p className="mt-4 text-sm text-ink-soft md:text-base">
            Este protocolo foi desenvolvido para pessoas que:
          </p>
          <div className="mt-8 space-y-3 text-left">
            {[
              'sentem que perderam sua identidade;',
              'vivem rela\u00e7\u00f5es desgastantes;',
              'desejam reconstruir a autoestima;',
              'precisam tomar decis\u00f5es dif\u00edceis;',
              'querem fortalecer a fam\u00edlia sem perder a pr\u00f3pria ess\u00eancia;',
              'buscam coer\u00eancia entre quem s\u00e3o e a forma como vivem.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl bg-white px-5 py-4 shadow-soft">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-se-violet" />
                <span className="text-sm leading-relaxed text-ink-soft">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DIAGN\u00d3STICO ─── */}
      <section className="relative z-10 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center" data-animate>
          <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">
            Descubra qual modalidade faz sentido para o seu momento
          </h2>
          <p className="mt-3 text-sm text-ink-muted">
            Responda 5 perguntas e receba uma orienta\u00e7\u00e3o personalizada.
          </p>
          <button
            onClick={() => { setShowDiagnostic(true); setCurrentQuestion(0); setAnswers([null, null, null, null, null]); setShowResult(false) }}
            className="btn-primary mt-8 group"
          >
            Iniciar meu diagn\u00f3stico de momento
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
                  'Aplica\u00e7\u00e3o completa da metodologia SynaptEssence360\u00ae',
                  'Exerc\u00edcios entre encontros',
                  'Reavalia\u00e7\u00e3o ao final do processo',
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
                  <p className="text-xs text-ink-muted">Parcelamento em at\u00e9 10x com juros da operadora.</p>
                </div>
              </div>
              <button className="btn-secondary mt-6 w-full">
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
              <h3 className="font-display text-xl font-semibold text-ink">Protocolo Integral de Reconstru\u00e7\u00e3o</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Destinado \u00e0s pessoas que vivem processos de reconstru\u00e7\u00e3o pessoal, familiar ou relacional e desejam um acompanhamento mais pr\u00f3ximo, estrat\u00e9gico e personalizado durante os 90 dias.
              </p>
              <div className="mt-4 mb-2 text-xs font-medium uppercase tracking-wider text-se-violet">
                Inclui tudo da Modalidade Social e ainda:
              </div>
              <div className="space-y-2">
                {[
                  'Planejamento individual do protocolo',
                  'Acompanhamento estrat\u00e9gico durante os 90 dias',
                  'Suporte entre encontros via WhatsApp (hor\u00e1rio comercial)',
                  'Exerc\u00edcios personalizados',
                  'Ajustes individualizados conforme evolu\u00e7\u00e3o',
                  'Direcionamento para momentos cr\u00edticos',
                  'Leitura ampliada dos impactos familiares e sist\u00eamicos',
                  'Constru\u00e7\u00e3o do Plano de Continuidade',
                  'Prioridade na agenda',
                  'Caderno de Regenera\u00e7\u00e3o SynaptEssence360\u00ae',
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
                  <p className="text-xs text-ink-muted">Parcelamento em at\u00e9 10x com juros da operadora.</p>
                </div>
              </div>
              <button className="btn-primary mt-6 w-full">
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
            Qual a diferen\u00e7a entre as duas modalidades?
          </h2>
          <div className="mt-10 rounded-3xl border border-ink/5 bg-white p-6 md:p-8">
            <p className="text-sm leading-relaxed text-ink-soft">
              A metodologia \u00e9 exatamente a mesma. Os encontros possuem a mesma dura\u00e7\u00e3o. O diferencial da modalidade Integral est\u00e1 na <strong className="text-ink">profundidade do acompanhamento</strong>, personaliza\u00e7\u00e3o, suporte entre sess\u00f5es e constru\u00e7\u00e3o estrat\u00e9gica do processo.
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
                    ['Metodologia SynaptEssence360\u00ae', true, true],
                    ['12 encontros individuais', true, true],
                    ['Exerc\u00edcios entre encontros', true, true],
                    ['Planejamento individual', false, true],
                    ['Suporte via WhatsApp', false, true],
                    ['Ajustes personalizados', false, true],
                    ['Leitura sist\u00eamica ampliada', false, true],
                    ['Caderno de Regenera\u00e7\u00e3o', false, true],
                    ['Prioridade na agenda', false, true],
                  ].map(([label, social, integral]) => (
                    <tr key={label as string}>
                      <td className="py-3 pr-4 text-ink-soft">{label as string}</td>
                      <td className="py-3 pr-4">{social ? <Check className="h-4 w-4 text-se-teal" /> : <span className="text-ink-muted">\u2014</span>}</td>
                      <td className="py-3">{integral ? <Check className="h-4 w-4 text-se-violet" /> : <span className="text-ink-muted">\u2014</span>}</td>
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
            Seu compromisso come\u00e7a aqui.
          </h2>
          <div className="mx-auto mt-8 max-w-xl space-y-4 text-sm leading-relaxed text-ink-soft md:text-base">
            <p>Ao iniciar este protocolo, voc\u00ea n\u00e3o est\u00e1 adquirindo apenas encontros.</p>
            <p>Est\u00e1 assumindo um compromisso consigo mesmo.</p>
            <p className="font-medium text-ink">
              Resgatar identidade exige presen\u00e7a.<br />
              Escolhas.<br />
              Continuidade.<br />
              Coragem.
            </p>
            <p className="font-display text-lg italic text-se-violet">
              Toda transforma\u00e7\u00e3o come\u00e7a quando novas conex\u00f5es s\u00e3o criadas.
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
              Declaro compreender que este protocolo \u00e9 um processo de desenvolvimento constru\u00eddo ao longo de 90 dias e me comprometo a participar ativamente da minha jornada.
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
            <p className="mt-3 text-xs text-ink-muted">Marque a declara\u00e7\u00e3o de compromisso acima para continuar.</p>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 pb-10 text-center">
        <div className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          <p>A tecnologia organiza dados.</p>
          <p>A metodologia gera compreens\u00e3o.</p>
          <p>O especialista conduz a transforma\u00e7\u00e3o.</p>
        </div>
      </footer>

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
                    5 perguntas \u2022 aproximadamente 1 minuto
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
                  N\u00e3o existe resposta certa. Existe a resposta que representa melhor o seu momento.
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
                    {currentQuestion === 4 ? 'Ver resultado' : 'Pr\u00f3xima'}
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
                  Sua indica\u00e7\u00e3o SynaptEssence360\u00ae
                </h3>

                {recommendation === 'social' && (
                  <div className="mt-6">
                    <div className="inline-block rounded-full bg-se-teal/10 px-5 py-2 text-sm font-semibold text-se-teal">
                      Modalidade Social
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                      Pelo que voc\u00ea compartilhou, a Modalidade Social parece oferecer uma estrutura adequada para o momento que est\u00e1 vivendo.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      Ela proporciona o acompanhamento necess\u00e1rio para desenvolver consci\u00eancia, novas perspectivas e pr\u00e1ticas de transforma\u00e7\u00e3o ao longo dos 90 dias, com a metodologia SynaptEssence360\u00ae.
                    </p>
                    <button onClick={() => scrollToModalities('social')} className="btn-primary mt-6">
                      Conhecer a Modalidade Social <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {recommendation === 'transition' && (
                  <div className="mt-6">
                    <div className="inline-block rounded-full bg-se-lavender px-5 py-2 text-sm font-semibold text-se-violet">
                      Voc\u00ea est\u00e1 em uma zona de transi\u00e7\u00e3o
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                      Suas respostas indicam que voc\u00ea est\u00e1 vivendo um processo que pode se beneficiar tanto de uma estrutura regular quanto de um acompanhamento mais pr\u00f3ximo.
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
                      Protocolo Integral de Reconstru\u00e7\u00e3o
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                      Pelas caracter\u00edsticas do momento que voc\u00ea descreveu, o Protocolo Integral de Reconstru\u00e7\u00e3o parece fazer mais sentido para sua jornada atual.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      Suas respostas indicam um momento que pode se beneficiar de maior proximidade, personaliza\u00e7\u00e3o e suporte estrat\u00e9gico durante os 90 dias.
                    </p>
                    <button onClick={() => scrollToModalities('integral')} className="btn-primary mt-6">
                      Conhecer minha recomenda\u00e7\u00e3o <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Why this modality */}
                <div className="mt-8 border-t border-ink/5 pt-6 text-left">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Por que essa modalidade?
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    Sua indica\u00e7\u00e3o considera principalmente os aspectos identificados nas suas respostas:
                  </p>
                  <div className="mt-4 space-y-3">
                    {answers[1] !== null && (answers[1] ?? 0) >= 3 && (
                      <div>
                        <div className="text-xs font-semibold text-se-violet">Identidade</div>
                        <p className="text-xs text-ink-muted">Necessidade de ampliar clareza sobre quem voc\u00ea \u00e9 e como deseja se posicionar.</p>
                      </div>
                    )}
                    {answers[2] !== null && (answers[2] ?? 0) >= 3 && (
                      <div>
                        <div className="text-xs font-semibold text-se-violet">Contexto relacional</div>
                        <p className="text-xs text-ink-muted">Presen\u00e7a de rela\u00e7\u00f5es ou sistemas que influenciam seu processo de mudan\u00e7a.</p>
                      </div>
                    )}
                    {answers[3] !== null && (answers[3] ?? 0) >= 3 && (
                      <div>
                        <div className="text-xs font-semibold text-se-violet">Sustenta\u00e7\u00e3o da mudan\u00e7a</div>
                        <p className="text-xs text-ink-muted">Necessidade de continuidade e acompanhamento para transformar compreens\u00e3o em a\u00e7\u00e3o.</p>
                      </div>
                    )}
                    {answers[0] !== null && (answers[0] ?? 0) >= 3 && (
                      <div>
                        <div className="text-xs font-semibold text-se-violet">Intensidade do momento</div>
                        <p className="text-xs text-ink-muted">Voc\u00ea est\u00e1 atravessando uma fase que pede profundidade e estrutura.</p>
                      </div>
                    )}
                    {answers[4] !== null && (answers[4] ?? 0) >= 3 && (
                      <div>
                        <div className="text-xs font-semibold text-se-violet">Decis\u00f5es importantes</div>
                        <p className="text-xs text-ink-muted">Momento que envolve escolhas significativas para sua vida.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-ink/5 pt-6">
                  <p className="text-xs italic text-ink-muted">
                    A escolha n\u00e3o deve come\u00e7ar pelo pre\u00e7o. Deve come\u00e7ar pelo que o seu momento exige.
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
