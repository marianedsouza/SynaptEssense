import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { AXIS } from '../../lib/axes'
import { LIKERT_SCALE } from '../../lib/questionBank'
import { buildQuestionList } from '../../lib/questionUtils'
import {
  completeParticipant,
  fetchParticipant,
  getSessionId,
  saveAnswers,
} from '../../lib/participants'
import type { Participant, Question } from '../../lib/types'

type Screen =
  | { kind: 'question'; question: Question }
  | { kind: 'transition'; axis: string }

function hasAnswer(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  return typeof value === 'string' && value.trim().length > 0
}

async function saveAnswersSilently(
  id: string,
  answers: Record<string, string | string[]>,
  progress: number,
): Promise<void> {
  try {
    await saveAnswers(id, answers, progress)
  } catch {
    /* silencioso: a próxima tentativa salvará novamente */
  }
}

export function Questionnaire() {
  const navigate = useNavigate()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [index, setIndex] = useState(0)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef<number | null>(null)
  const initializedRef = useRef(false)

  const screens = useMemo<Screen[]>(() => {
    const all = buildQuestionList(participant?.survey_for ?? null)

    const list: Screen[] = []
    const seenAxes = new Set<string>()
    for (const q of all) {
      if (q.axis !== 'open' && !seenAxes.has(q.axis)) {
        list.push({ kind: 'transition', axis: q.axis })
        seenAxes.add(q.axis)
      }
      list.push({ kind: 'question', question: q })
    }
    return list
  }, [participant])

  useEffect(() => {
    const id = getSessionId()
    if (!id) {
      navigate('/', { replace: true })
      return
    }
    fetchParticipant(id).then((p) => {
      if (!p) {
        navigate('/', { replace: true })
        return
      }
      if (p.status === 'concluido') {
        navigate('/concluido', { replace: true })
        return
      }
      setParticipant(p)
      setAnswers(p.answers ?? {})
      setLoading(false)
    })
  }, [navigate])

  useEffect(() => {
    if (initializedRef.current || loading || !participant) return
    const savedAnswers = participant.answers ?? {}
    const firstUnanswered = screens.findIndex(
      (s) => s.kind === 'question' && !hasAnswer(savedAnswers[s.question.id]),
    )
    setIndex(firstUnanswered === -1 ? 0 : firstUnanswered)
    initializedRef.current = true
  }, [loading, participant, screens])

  const persist = useCallback(
    (nextAnswers: typeof answers, participantId: string) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(async () => {
        const answered = screens.filter(
          (s) => s.kind === 'question' && hasAnswer(nextAnswers[s.question.id]),
        ).length
        const total = screens.filter((s) => s.kind === 'question').length
        await saveAnswersSilently(
          participantId,
          nextAnswers,
          total ? Math.round((answered / total) * 100) : 0,
        )
        setSaved(true)
        window.setTimeout(() => setSaved(false), 2200)
      }, 500)
    },
    [screens],
  )

  const setAnswer = (questionId: string, value: string | string[]) => {
    if (!participant) return
    const next = { ...answers, [questionId]: value }
    setAnswers(next)
    persist(next, participant.id)
    setError(null)
  }

  const totalQuestions = screens.filter((s) => s.kind === 'question').length
  const answeredCount = screens.filter(
    (s) => s.kind === 'question' && hasAnswer(answers[s.question.id]),
  ).length
  const progress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0

  const current = screens[index]
  const isFirst = index === 0

  const isLastQuestion = useMemo(() => {
    if (current?.kind !== 'question') return false
    for (let i = index + 1; i < screens.length; i++) {
      if (screens[i].kind === 'question') return false
    }
    return true
  }, [current, index, screens])

  const goNext = async () => {
    if (!current || !participant) return
    if (current.kind === 'question') {
      const value = answers[current.question.id]
      if (current.question.required && !hasAnswer(value)) {
        setError(
          current.question.type === 'likert' || current.question.type === 'single'
            ? 'Escolha uma opção para avançarmos.'
            : 'Precisamos dessa informação para continuar.',
        )
        return
      }
    }
    setError(null)
    if (isLastQuestion) {
      const allFinal = { ...answers }
      const started = participant.started_at
        ? new Date(participant.started_at).getTime()
        : Date.now()
      const elapsed = Math.max(0, Math.round((Date.now() - started) / 1000))
      await completeParticipant(participant.id, allFinal, 100, elapsed)
      navigate('/concluido')
      return
    }
    setIndex((i) => Math.min(screens.length - 1, i + 1))
  }

  const goBack = () => {
    if (!current || index === 0) return
    setError(null)
    setIndex((i) => i - 1)
  }

  if (loading || !participant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
      </div>
    )
  }

  if (!current) return null

  if (current.kind === 'transition') {
    const meta = AXIS[current.axis]
    return <TransitionScreen meta={meta} onContinue={goNext} />
  }

  const question = current.question
  const axisMeta = AXIS[question.axis]

  return (
    <div className="flex min-h-screen flex-col bg-se-mist">
      <header className="sticky top-0 z-20 border-b border-ink/5 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            {saved && (
              <span className="flex items-center gap-1 text-se-green">
                <Check className="h-3.5 w-3.5" />
                Progresso salvo
              </span>
            )}
            <span className="rounded-full bg-se-lavender px-3 py-1 font-medium text-se-violet-dark">
              {answeredCount + 1} de {totalQuestions}
            </span>
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-se-violet">
              {axisMeta.label}
            </div>
            <div className="text-[11px] text-ink-muted">{progress}%</div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
            <div
              className="bg-grad h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-5 py-10">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <div key={question.id} className="animate-fade-up">
            <div className="text-center">
              <div className="font-display text-xl leading-relaxed text-ink md:text-2xl">
                {question.text}
              </div>
            </div>
            <div className="mt-10">
              <QuestionInput
                question={question}
                value={answers[question.id]}
                onChange={(v) => setAnswer(question.id, v)}
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-12 flex items-center justify-between gap-4">
            <button
              onClick={goBack}
              disabled={isFirst}
              className="btn-secondary !px-5 !py-3 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <button onClick={goNext} className="btn-primary group !px-7 !py-3">
              {isLastQuestion ? 'Finalizar' : 'Continuar'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string | string[] | undefined
  onChange: (v: string | string[]) => void
}) {
  if (question.type === 'likert') {
    return (
      <div className="space-y-2.5">
        {LIKERT_SCALE.map((option) => {
          const active = value === String(option.value)
          return (
            <button
              key={option.value}
              onClick={() => onChange(String(option.value))}
              className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                active
                  ? 'border-se-violet bg-se-lavender shadow-soft'
                  : 'border-ink/10 bg-white hover:border-se-violet/40 hover:bg-white/70'
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors ${
                  active
                    ? 'border-se-violet bg-se-violet text-white'
                    : 'border-ink/15 text-ink-soft'
                }`}
              >
                {option.value}
              </span>
              <span
                className={`text-sm md:text-base ${
                  active ? 'font-medium text-se-violet-dark' : 'text-ink-soft'
                }`}
              >
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  if (question.type === 'single') {
    return (
      <div className="space-y-2.5">
        {question.options.map((option) => {
          const active = value === option.id
          return (
            <button
              key={option.id}
              onClick={() => onChange(option.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                active
                  ? 'border-se-violet bg-se-lavender shadow-soft'
                  : 'border-ink/10 bg-white hover:border-se-violet/40'
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                  active ? 'border-se-violet' : 'border-ink/20'
                }`}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-se-violet" />}
              </span>
              <span
                className={`text-sm md:text-base ${
                  active ? 'font-medium text-se-violet-dark' : 'text-ink-soft'
                }`}
              >
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  if (question.type === 'multiple') {
    const selected = Array.isArray(value) ? value : []
    return (
      <div className="flex flex-wrap gap-2.5">
        {question.options.map((option) => {
          const active = selected.includes(option.id)
          return (
            <button
              key={option.id}
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((id) => id !== option.id)
                    : [...selected, option.id],
                )
              }
              className={`rounded-full border px-5 py-3 text-sm transition-all duration-200 ${
                active
                  ? 'border-se-violet bg-se-lavender font-medium text-se-violet-dark shadow-soft'
                  : 'border-ink/15 bg-white text-ink-soft hover:border-se-violet/40'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <textarea
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      rows={question.type === 'text' ? 3 : 6}
      className="input resize-y !rounded-2xl text-base leading-relaxed"
      placeholder="Escreva aqui com suas palavras…"
    />
  )
}

function TransitionScreen({
  meta,
  onContinue,
}: {
  meta: (typeof AXIS)[keyof typeof AXIS]
  onContinue: () => void
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-se-mist px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-se-violet/10 blur-3xl" />
        <div className="absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-se-teal/10 blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto max-w-xl text-center animate-fade-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-se-violet">
          {meta.id === 'brand' ? 'Um novo eixo' : 'Agora, vamos olhar para outra dimensão'}
        </div>
        <h2 className="mt-6 font-display text-4xl font-semibold text-ink md:text-5xl">
          {meta.label}
        </h2>
        <p className="mt-4 font-display text-lg italic text-se-violet-dark">
          “{meta.centralQuestion}”
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink-soft md:text-base">
          {meta.description}
        </p>
        <button onClick={onContinue} className="btn-primary group mt-10">
          Continuar
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  )
}
