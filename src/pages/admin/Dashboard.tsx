import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileDown,
  FileSpreadsheet,
  Search,
  UserRound,
} from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { fetchParticipants } from '../../lib/admin'
import { exportParticipantExcel, exportParticipantPdf } from '../../lib/export'
import { buildQuestionList } from '../../lib/questionUtils'
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

export function Dashboard() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')

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

  useEffect(() => {
    load()
  }, [load])

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

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
          SynaptEssence360®
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink">
          Visão geral
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Levantamentos iniciados', value: stats.total, tone: 'text-se-teal' },
          { label: 'Em andamento', value: stats.ongoing, tone: 'text-amber-600' },
          { label: 'Concluídos', value: stats.done, tone: 'text-se-green' },
          { label: 'Progresso médio', value: `${stats.avgProgress}%`, tone: 'text-se-violet' },
        ].map((card) => (
          <div key={card.label} className="card p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {card.label}
            </div>
            <div className={`mt-2 font-display text-3xl font-semibold ${card.tone}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-8 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-ink/5 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-se-violet" />
            <h2 className="font-display text-xl font-semibold text-ink">
              Participantes
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="input !py-2.5 pl-9"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="input !w-auto !py-2.5"
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3 font-semibold">Participante</th>
                  <th className="px-5 py-3 font-semibold">Tipo</th>
                  <th className="px-5 py-3 font-semibold">Data</th>
                  <th className="px-5 py-3 font-semibold">Progresso</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
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
                      <div className="text-xs text-ink-muted">{p.email || '—'}</div>
                    </td>
                    <td className="px-5 py-4 text-ink-soft">{p.survey_for || '—'}</td>
                    <td className="px-5 py-4 text-ink-soft">{fmtDate(p.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink/5">
                          <div
                            className="bg-grad h-full rounded-full"
                            style={{ width: `${p.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-ink-muted">{p.progress ?? 0}%</span>
                      </div>
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
                          className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-se-violet hover:text-se-violet"
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
