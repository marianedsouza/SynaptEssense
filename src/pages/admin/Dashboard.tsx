import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  FileDown,
  FileSpreadsheet,
  Phone,
  Search,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { deleteParticipant, fetchParticipants } from '../../lib/admin'
import { exportParticipantExcel, exportParticipantPdf } from '../../lib/export'
import { buildQuestionList } from '../../lib/questionUtils'
import { participantPosition } from '../../lib/questionUtils'
import type { ParticipantPosition } from '../../lib/questionUtils'
import { AXIS } from '../../lib/axes'
import { supabase } from '../../lib/supabase'
import type { Participant } from '../../lib/types'

type Filter = 'todos' | 'iniciado' | 'em_andamento' | 'concluido'

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
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function whereStoppedText(pos: ParticipantPosition, status: string): string {
  if (status === 'concluido')
    return `Levantamento concluído (${pos.total} perguntas)`
  if (pos.answered === 0) return `Ainda não respondeu nenhuma pergunta`
  const axis = pos.nextQuestion
    ? (AXIS[pos.nextQuestion.axis]?.shortLabel ?? pos.nextQuestion.axis)
    : null
  return `Parou na pergunta ${pos.answered} de ${pos.total}${
    axis ? ` · próxima: ${axis}` : ''
  }`
}

function whereStoppedShort(pos: ParticipantPosition, status: string): string {
  if (status === 'concluido') return `Concluído · ${pos.total} perguntas`
  if (pos.answered === 0) return `Iniciado · 0/${pos.total}`
  const axis = pos.nextQuestion
    ? (AXIS[pos.nextQuestion.axis]?.shortLabel ?? pos.nextQuestion.axis)
    : null
  return `Pergunta ${pos.answered}/${pos.total}${axis ? ` · ${axis}` : ''}`
}

export function Dashboard() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
  const [leads, setLeads] = useState<{ id: string; name: string; phone: string; modality: string; created_at: string }[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchParticipants()
      setParticipants(data)
    } catch {
      setParticipants([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLeads = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('protocol_leads')
        .select('*')
        .order('created_at', { ascending: false })
      setLeads(data ?? [])
    } catch {
      setLeads([])
    } finally {
      setLeadsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    loadLeads()
  }, [load, loadLeads])

  const positions = useMemo(() => {
    const map: Record<string, ParticipantPosition> = {}
    for (const p of participants) {
      map[p.id] = participantPosition(p.survey_for, p.answers ?? {})
    }
    return map
  }, [participants])

  const filtered = useMemo(() => {
    return participants.filter((p) => {
      const matchFilter = filter === 'todos' || p.status === filter
      const name = (p.name ?? '').toLowerCase()
      const email = (p.email ?? '').toLowerCase()
      const q = query.toLowerCase()
      const matchQuery = !q || name.includes(q) || email.includes(q)
      return matchFilter && matchQuery
    })
  }, [participants, filter, query])

  const searchResults = useMemo(
    () => (query.trim() ? filtered.slice(0, 6) : []),
    [filtered, query],
  )

  const stats = useMemo(() => {
    const total = participants.length
    const done = participants.filter((p) => p.status === 'concluido').length
    const ongoing = participants.filter((p) => p.status === 'em_andamento').length
    const started = participants.filter((p) => p.status === 'iniciado').length
    const avgProgress = total
      ? Math.round(participants.reduce((acc, p) => acc + (p.progress ?? 0), 0) / total)
      : 0
    return { total, done, ongoing, started, avgProgress }
  }, [participants])

  const questionListFor = (p: Participant) =>
    buildQuestionList(p.survey_for ?? '')

  const handleExport = async (p: Participant, kind: 'pdf' | 'excel') => {
    const questions = questionListFor(p)
    if (kind === 'pdf') exportParticipantPdf(p, questions)
    else await exportParticipantExcel(p, questions)
  }

  const handleDelete = async (p: Participant) => {
    const confirmed = window.confirm(
      `Excluir ${p.name || p.email || 'este participante'}? Essa ação não pode ser desfeita.`,
    )
    if (!confirmed) return
    const res = await deleteParticipant(p.id)
    if (!res.ok) {
      window.alert(`Não foi possível excluir: ${res.error ?? 'erro desconhecido'}`)
      return
    }
    setParticipants((prev) => prev.filter((x) => x.id !== p.id))
  }

  return (
    <AdminLayout>
      <div className="mb-4 md:mb-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-se-violet md:text-[11px]">
          SynaptEssence360®
        </div>
        <h1 className="mt-0.5 font-display text-2xl font-semibold text-ink md:text-3xl">
          Visão geral
        </h1>
      </div>

      <div className="relative z-20 mb-4 md:mb-8">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="input !py-2.5 pl-10 text-sm"
          />
        </div>
        {query.trim() && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft">
            {searchResults.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-ink-muted">
                Nenhum participante encontrado com “{query}”.
              </div>
            ) : (
              searchResults.map((p) => {
                const pos = positions[p.id]
                return (
                  <Link
                    key={p.id}
                    to={`/admin/participantes/${p.id}`}
                    className="flex items-center gap-3 border-b border-ink/5 px-4 py-2.5 transition hover:bg-se-mist/60 last:border-b-0"
                  >
                    <div className="bg-grad grid h-8 w-8 shrink-0 place-items-center rounded-lg">
                      <UserRound className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-ink">
                          {p.name || 'Sem nome'}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge(p.status)}`}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-ink-muted">
                        {p.email || '—'}
                      </div>
                      <div className="mt-0.5 text-[11px] font-medium text-se-violet-dark">
                        {whereStoppedShort(pos, p.status)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
                  </Link>
                )
              })
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Iniciados', value: stats.total, tone: 'text-se-teal' },
          { label: 'Em andamento', value: stats.ongoing, tone: 'text-amber-600' },
          { label: 'Concluídos', value: stats.done, tone: 'text-se-green' },
          { label: 'Progresso médio', value: `${stats.avgProgress}%`, tone: 'text-se-violet' },
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              {card.label}
            </div>
            <div className={`mt-1 font-display text-2xl font-semibold ${card.tone}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4 overflow-hidden md:mt-8">
        <div className="flex flex-col gap-3 border-b border-ink/5 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-se-violet" />
            <h2 className="font-display text-lg font-semibold text-ink md:text-xl">
              Interesses no Protocolo
            </h2>
            <span className="rounded-full bg-se-lavender px-2.5 py-0.5 text-xs font-medium text-se-violet">
              {leads.length}
            </span>
          </div>
        </div>
        {leadsLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
          </div>
        ) : leads.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-muted">
            Nenhum interesse registrado ainda.
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden">
              {leads.map((lead) => (
                <div key={lead.id} className="border-b border-ink/5 px-4 py-3 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-ink">{lead.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3 w-3 text-ink-muted" />
                        <span className="text-xs text-ink-muted">{lead.phone}</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${lead.modality === 'integral' ? 'bg-se-lavender text-se-violet' : 'bg-se-sky text-se-teal'}`}>
                      {lead.modality === 'integral' ? 'Integral' : 'Social'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-ink-muted">
                    {new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-5 py-3 font-semibold">Nome</th>
                    <th className="px-5 py-3 font-semibold">Telefone</th>
                    <th className="px-5 py-3 font-semibold">Modalidade</th>
                    <th className="px-5 py-3 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-ink/5 transition-colors hover:bg-se-mist/60">
                      <td className="px-5 py-3 font-medium text-ink">{lead.name}</td>
                      <td className="px-5 py-3">
                        <a href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-ink-soft hover:text-se-teal transition">
                          <Phone className="h-3.5 w-3.5" />
                          {lead.phone}
                        </a>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${lead.modality === 'integral' ? 'bg-se-lavender text-se-violet' : 'bg-se-sky text-se-teal'}`}>
                          {lead.modality === 'integral' ? 'Protocolo Integral' : 'Modalidade Social'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card mt-4 overflow-hidden md:mt-8">
        <div className="flex flex-col gap-3 border-b border-ink/5 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-se-violet" />
            <h2 className="font-display text-lg font-semibold text-ink md:text-xl">
              Participantes
            </h2>
            <span className="rounded-full bg-se-mist px-2.5 py-0.5 text-xs font-medium text-ink-muted">
              {filtered.length}
            </span>
          </div>
          <div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="input !w-full !py-2 text-sm md:!w-auto"
            >
              <option value="todos">Todos</option>
              <option value="iniciado">Iniciados</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluídos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-ink-muted">
            Nenhum participante encontrado.
          </div>
        ) : (
          <>
            <div className="sm:hidden">
              {filtered.map((p) => {
                const pos = positions[p.id]
                return (
                  <div
                    key={p.id}
                    className="border-b border-ink/5 px-4 py-3 last:border-b-0"
                  >
                    <Link
                      to={`/admin/participantes/${p.id}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-ink">
                          {p.name || 'Sem nome'}
                        </div>
                        <div className="truncate text-[11px] text-ink-muted">
                          {p.email || '—'}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge(p.status)}`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </Link>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink/5">
                        <div
                          className="bg-grad h-full rounded-full"
                          style={{ width: `${p.progress ?? 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-ink-muted">
                        {p.progress ?? 0}%
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-se-violet-dark">
                        {whereStoppedShort(pos, p.status)}
                      </span>
                      <span className="shrink-0 truncate text-[11px] text-ink-muted">
                        {p.survey_for || '—'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Link
                        to={`/admin/participantes/${p.id}`}
                        className="rounded-full bg-se-green px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-se-teal-dark"
                      >
                        Abrir
                      </Link>
                      <button
                        onClick={() => handleExport(p, 'pdf')}
                        className="flex items-center gap-1 rounded-full border border-ink/10 px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:border-se-violet hover:text-se-violet"
                        title="Exportar PDF"
                      >
                        <FileDown className="h-3 w-3" />
                        PDF
                      </button>
                      <button
                        onClick={() => handleExport(p, 'excel')}
                        className="flex items-center gap-1 rounded-full border border-ink/10 px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:border-se-violet hover:text-se-violet"
                        title="Exportar Excel"
                      >
                        <FileSpreadsheet className="h-3 w-3" />
                        Excel
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-50 hover:border-red-300"
                        title="Excluir participante"
                      >
                        <Trash2 className="h-3 w-3" />
                        Excluir
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-5 py-3 font-semibold">Participante</th>
                    <th className="hidden px-5 py-3 font-semibold lg:table-cell">
                      Tipo
                    </th>
                    <th className="hidden px-5 py-3 font-semibold md:table-cell">
                      Data
                    </th>
                    <th className="px-5 py-3 font-semibold">Progresso</th>
                    <th className="px-5 py-3 font-semibold">Onde parou</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const pos = positions[p.id]
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-ink/5 transition-colors hover:bg-se-mist/60"
                      >
                        <td className="px-5 py-4">
                          <Link
                            to={`/admin/participantes/${p.id}`}
                            className="font-medium text-ink hover:text-se-violet"
                          >
                            {p.name || 'Sem nome'}
                          </Link>
                          <div className="text-xs text-ink-muted">
                            {p.email || '—'}
                          </div>
                        </td>
                        <td className="hidden px-5 py-4 text-ink-soft lg:table-cell">
                          {p.survey_for || '—'}
                        </td>
                        <td className="hidden px-5 py-4 text-ink-soft md:table-cell">
                          {fmtDate(p.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink/5">
                              <div
                                className="bg-grad h-full rounded-full"
                                style={{ width: `${p.progress ?? 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-ink-muted">
                              {p.progress ?? 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-medium text-se-violet-dark">
                            {whereStoppedText(pos, p.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadge(p.status)}`}
                          >
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/admin/participantes/${p.id}`}
                              className="rounded-full bg-se-green px-3 py-1.5 text-xs font-medium text-white transition hover:bg-se-teal-dark"
                            >
                              Abrir
                            </Link>
                            <button
                              onClick={() => handleExport(p, 'pdf')}
                              className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-se-violet hover:text-se-violet"
                              title="Exportar PDF"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleExport(p, 'excel')}
                              className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-se-violet hover:text-se-violet"
                              title="Exportar Excel"
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="rounded-full border border-red-200 p-1.5 text-red-600 transition hover:bg-red-50 hover:border-red-300"
                              title="Excluir participante"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
