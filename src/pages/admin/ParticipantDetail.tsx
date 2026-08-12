import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BrainCircuit,
  FileDown,
  FileSpreadsheet,
  Save,
} from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { fetchAnalystNote, fetchParticipantById, upsertAnalystNote } from '../../lib/admin'
import { AXIS } from '../../lib/axes'
import { exportParticipantExcel, exportParticipantPdf, groupAnswersByAxis } from '../../lib/export'
import { buildQuestionList } from '../../lib/questionUtils'
import type { AnalystNote, Participant } from '../../lib/types'

type Tab = 'resumo' | 'respostas' | 'analise' | 'inteligencia'

const STATUS_LABEL: Record<string, string> = {
  iniciado: 'Iniciado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    iniciado: 'bg-se-sky text-se-teal',
    em_andamento: 'bg-amber-50 text-amber-700',
    concluido: 'bg-se-green-soft text-se-green',
  }
  return styles[status] ?? 'bg-se-mist text-ink-muted'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const NOTE_FIELDS: { key: keyof Omit<AnalystNote, 'id' | 'participant_id' | 'updated_at'>; label: string; hint: string }[] = [
  { key: 'impressions', label: 'Impressões iniciais', hint: 'Suas primeiras percepções ao ler este levantamento.' },
  { key: 'observations', label: 'Observações', hint: 'Anotações livres sobre o processo.' },
  { key: 'deepening', label: 'Pontos para aprofundamento', hint: 'Temas que merecem atenção em uma próxima conversa.' },
  { key: 'potentials', label: 'Potenciais percebidos', hint: 'Recursos e capacidades que aparecem nas respostas.' },
  { key: 'attention_points', label: 'Pontos de atenção', hint: 'Padrões que podem interferir na atuação.' },
  { key: 'next_steps', label: 'Próximos passos', hint: 'Encaminhamentos sugeridos.' },
]

export function ParticipantDetail() {
  const { id } = useParams<{ id: string }>()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('resumo')
  const [axisFilter, setAxisFilter] = useState<string>('all')
  const [note, setNote] = useState<AnalystNote | null>(null)
  const [noteSaved, setNoteSaved] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchParticipantById(id).then((p) => {
      if (!p) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setParticipant(p)
      fetchAnalystNote(p.id).then(setNote)
      setLoading(false)
    })
  }, [id])

  const questions = useMemo(
    () => (participant ? buildQuestionList(participant.survey_for) : []),
    [participant],
  )

  const groups = useMemo(
    () => (participant ? groupAnswersByAxis(questions, participant.answers ?? {}) : []),
    [participant, questions],
  )

  const persistNote = useCallback((field: keyof AnalystNote, value: string) => {
    setNote((prev) => {
      if (!prev || !participant) return prev
      const next = { ...prev, [field]: value }
      window.setTimeout(async () => {
        const ok = await upsertAnalystNote(participant.id, {
          impressions: next.impressions,
          observations: next.observations,
          deepening: next.deepening,
          potentials: next.potentials,
          attention_points: next.attention_points,
          next_steps: next.next_steps,
        })
        if (ok) {
          setNoteSaved(true)
          window.setTimeout(() => setNoteSaved(false), 2000)
        }
      }, 800)
      return next
    })
  }, [participant])

  const handleExport = async (kind: 'pdf' | 'excel') => {
    if (!participant) return
    if (kind === 'pdf') exportParticipantPdf(participant, questions)
    else await exportParticipantExcel(participant, questions)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
        </div>
      </AdminLayout>
    )
  }

  if (notFound || !participant) {
    return (
      <AdminLayout>
        <div className="py-16 text-center text-sm text-ink-muted">
          Participante não encontrado.{' '}
          <Link className="text-se-violet underline" to="/admin">
            Voltar para a visão geral
          </Link>
        </div>
      </AdminLayout>
    )
  }

  const visibleGroups = groups.filter(
    (g) => axisFilter === 'all' || g.axis === axisFilter,
  )

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            to="/admin"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-se-violet"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Visão geral
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink">
              {participant.name || 'Sem nome'}
            </h1>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadge(participant.status)}`}
            >
              {STATUS_LABEL[participant.status] ?? participant.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Dossiê do Levantamento SynaptEssence360® ·{' '}
            {fmtDate(participant.created_at)}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleExport('pdf')} className="btn-secondary !px-5 !py-3">
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </button>
          <button onClick={() => handleExport('excel')} className="btn-primary !px-5 !py-3">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-soft">
        {[
          { key: 'resumo' as Tab, label: 'Resumo' },
          { key: 'respostas' as Tab, label: 'Respostas' },
          { key: 'analise' as Tab, label: 'Análise Técnica' },
          { key: 'inteligencia' as Tab, label: 'Inteligência SynaptEssence360®' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-se-lavender text-se-violet-dark'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumo' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              Identificação
            </h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              {[
                ['Nome', participant.name],
                ['E-mail', participant.email],
                ['Cidade / Estado', participant.city ? `${participant.city} / ${participant.state ?? ''}` : participant.state],
                ['Nascimento', participant.birth_date],
                ['Idade', participant.age ? String(participant.age) : null],
                ['Área de atuação', participant.field],
                ['Tempo de atuação', participant.experience_time],
                ['Empresa / Marca', participant.organization],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="text-right font-medium text-ink">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              Processo
            </h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              {[
                ['Tipo de levantamento', participant.survey_for],
                ['Versão do questionário', participant.questionnaire_version],
                ['Iniciado em', fmtDate(participant.started_at)],
                ['Concluído em', fmtDate(participant.completed_at)],
                ['Consentimento', participant.consent ? 'Registrado' : 'Não registrado'],
                [
                  'Progresso',
                  `${participant.progress ?? 0}%`,
                ],
                [
                  'Tempo de conclusão',
                  participant.completed_time_seconds
                    ? `${Math.floor(participant.completed_time_seconds / 60)} min ${participant.completed_time_seconds % 60} s`
                    : '—',
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="text-right font-medium text-ink">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {tab === 'respostas' && (
        <div className="card p-5 md:p-6">
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setAxisFilter('all')}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                axisFilter === 'all'
                  ? 'bg-se-violet text-white'
                  : 'border border-ink/10 text-ink-soft hover:border-se-violet'
              }`}
            >
              Todos
            </button>
            {groups.map((g) => (
              <button
                key={g.axis}
                onClick={() => setAxisFilter(g.axis)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  axisFilter === g.axis
                    ? 'bg-se-violet text-white'
                    : 'border border-ink/10 text-ink-soft hover:border-se-violet'
                }`}
              >
                {AXIS[g.axis]?.label ?? g.axis}
              </button>
            ))}
          </div>

          {visibleGroups.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-muted">
              Nenhuma resposta registrada neste eixo.
            </p>
          )}

          {visibleGroups.map((group) => (
            <div key={group.axis} className="mb-8 last:mb-0">
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-grad h-8 w-1 rounded-full" />
                <h3 className="font-display text-xl font-semibold text-ink">
                  {AXIS[group.axis]?.label ?? group.axis}
                </h3>
              </div>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div
                    key={item.question.id}
                    className="rounded-2xl border border-ink/5 bg-se-mist/50 p-4"
                  >
                    <p className="text-sm font-medium text-ink">
                      {item.question.text}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-se-violet-dark">
                      {item.answer || (
                        <span className="italic text-ink-muted">Sem resposta</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'analise' && (
        <div className="card p-5 md:p-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink">
              Análise Técnica SynaptEssence360®
            </h2>
            {noteSaved && (
              <span className="flex items-center gap-1 text-xs text-se-green">
                <Save className="h-3.5 w-3.5" />
                Salvo
              </span>
            )}
          </div>
          <p className="mb-6 text-sm text-ink-muted">
            Espaço privado do analista. O participante não tem acesso a estas
            anotações.
          </p>
          <div className="space-y-6">
            {NOTE_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="label">{field.label}</label>
                <textarea
                  value={(note?.[field.key] as string) ?? ''}
                  onChange={(e) => persistNote(field.key, e.target.value)}
                  rows={3}
                  className="input resize-y"
                  placeholder={field.hint}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'inteligencia' && (
        <div className="card p-5 md:p-8">
          <div className="flex items-center gap-3">
            <div className="bg-grad grid h-12 w-12 place-items-center rounded-2xl">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">
                Inteligência SynaptEssence360®
              </h2>
              <p className="text-sm text-ink-muted">Módulo em desenvolvimento</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-se-violet/30 bg-se-lavender/30 p-6 text-center">
            <p className="text-sm leading-relaxed text-ink-soft">
              Nesta primeira versão, os cálculos arquetípicos ainda não são
              executados. A arquitetura já está preparada para receber,
              futuramente, o motor de indicadores, arquétipos, correlações e a
              análise multidimensional.
            </p>
          </div>
          <p className="mt-6 text-center text-xs uppercase tracking-[0.2em] text-ink-muted">
            A tecnologia organiza dados. A metodologia gera compreensão.
          </p>
        </div>
      )}
    </AdminLayout>
  )
}
