import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { PROTOCOL_TOTAL_SESSIONS, planDurationMonths } from '../../lib/protocol'

interface LeadRec {
  id: string
  name: string
  archetype: string | null
  modality: 'social' | 'integral'
  plan: 'mensal' | 'completo' | null
  created_at: string
}

interface PayRec {
  id: string
  lead_id: string
  status: string
}

interface SessionRow {
  id: string
  lead_id: string
  date: string
  time: string | null
  status: 'agendada' | 'realizada' | 'faltou'
  notes: string | null
  protocol_leads?: LeadRec
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const STATUS_STYLE: Record<string, string> = {
  agendada: 'bg-se-sky text-se-teal',
  realizada: 'bg-se-teal/10 text-se-teal',
  faltou: 'bg-amber-50 text-amber-600',
}

function fmtTime(time: string | null) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h)) return time
  return `${String(h).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`
}

export function TherapistAgenda() {
  const [today] = useState(() => new Date())
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [leads, setLeads] = useState<LeadRec[]>([])
  const [payments, setPayments] = useState<PayRec[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'list'>('month')

  const load = useCallback(async () => {
    const [lRes, pRes, sRes] = await Promise.all([
      supabase.from('protocol_leads').select('*').order('name'),
      supabase.from('payments').select('lead_id, status'),
      supabase
        .from('sessions')
        .select('*, protocol_leads(name, archetype, modality, plan, created_at)')
        .order('date', { ascending: true })
        .order('time', { ascending: true }),
    ])
    setLeads((lRes.data ?? []) as LeadRec[])
    setPayments((pRes.data ?? []) as PayRec[])
    setSessions((sRes.data ?? []) as SessionRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Per-lead: paid? finished? -> active plan
  const activeLeadIds = useMemo(() => {
    const paidLeads = new Set<string>()
    const realizedByLead = new Map<string, number>()
    payments.forEach((p) => {
      if (p.status === 'approved' && p.lead_id) paidLeads.add(p.lead_id)
    })
    sessions.forEach((s) => {
      if (s.status === 'realizada') {
        realizedByLead.set(s.lead_id, (realizedByLead.get(s.lead_id) ?? 0) + 1)
      }
    })
    const now = Date.now()
    const active = new Set<string>()
    leads.forEach((lead) => {
      if (!paidLeads.has(lead.id)) return
      const realized = realizedByLead.get(lead.id) ?? 0
      const months = lead.plan ? planDurationMonths(lead.plan) : 3
      const end = new Date(new Date(lead.created_at).getTime() + months * 30 * 24 * 60 * 60 * 1000).getTime()
      const finished = realized >= PROTOCOL_TOTAL_SESSIONS || now > end
      if (!finished) active.add(lead.id)
    })
    return active
  }, [leads, payments, sessions])

  const activeSessions = sessions.filter((s) => activeLeadIds.has(s.lead_id))

  // Calendar grid
  const calendar = useMemo(() => {
    const first = new Date(year, month, 1)
    const startDow = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, SessionRow[]>()
    activeSessions.forEach((s) => {
      const d = new Date(s.date + 'T00:00:00')
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        map.set(day, [...(map.get(day) ?? []), s])
      }
    })
    return map
  }, [activeSessions, year, month])

  const sortedList = [...activeSessions].sort((a, b) =>
    (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')),
  )
  const todayKey = `${today.getFullYear()}-${today.getMonth()}`

  function changeMonth(dir: number) {
    let y = year
    let m = month + dir
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setMonth(m)
    setYear(y)
  }

  return (
    <AdminLayout>
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-se-violet md:text-[11px]">Painel do analista</div>
        <h1 className="mt-0.5 flex items-center gap-2 font-display text-2xl font-semibold text-ink md:text-3xl">
          <CalendarDays className="h-7 w-7 text-se-violet" />
          Agenda do terapeuta
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Atendimentos dos pacientes com plano ativo.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-soft">
          {(['month', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${view === v ? 'bg-se-lavender text-se-violet-dark' : 'text-ink-soft hover:text-ink'}`}
            >
              {v === 'month' ? 'Mês' : 'Lista'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="rounded-xl border border-ink/10 bg-white p-2 text-ink-muted hover:text-ink">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-40 text-center font-display text-lg font-semibold text-ink">
            {MONTHS[month]} {year}
          </span>
          <button onClick={() => changeMonth(1)} className="rounded-xl border border-ink/10 bg-white p-2 text-ink-muted hover:text-ink">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setMonth(today.getMonth())
              setYear(today.getFullYear())
            }}
            className="rounded-xl border border-se-violet/20 px-3 py-2 text-sm font-medium text-se-violet hover:bg-se-lavender"
          >
            Hoje
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
        </div>
      ) : view === 'month' ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-ink/5 bg-se-mist/40">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendar.map((day, i) => {
              const daySessions = day ? (sessionsByDay.get(day) ?? []) : []
              const isToday = day && todayKey === `${year}-${month}`
              const isCurrentDay = day === today.getDate() && todayKey === `${year}-${month}`
              return (
                <div
                  key={i}
                  className={`min-h-[110px] border-b border-ink/5 p-1.5 ${i % 7 !== 6 ? 'border-r border-ink/5' : ''} ${isToday ? 'bg-se-lavender/10' : ''} ${day ? '' : 'bg-se-mist/40'}`}
                >
                  {day && (
                    <>
                      <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isCurrentDay ? 'bg-se-violet text-white' : 'text-ink-muted'}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {daySessions.slice(0, 3).map((s) => (
                          <Link
                            key={s.id}
                            to={`/admin/interesses/${s.lead_id}`}
                            className={`block rounded-lg px-1.5 py-1 text-[10px] font-medium leading-tight ${STATUS_STYLE[s.status] ?? 'bg-se-sky text-se-teal'} transition hover:opacity-80`}
                          >
                            {fmtTime(s.time) && <span className="font-semibold">{fmtTime(s.time)} </span>}
                            {s.protocol_leads?.name ?? 'Paciente'}
                          </Link>
                        ))}
                        {daySessions.length > 3 && (
                          <div className="px-1.5 text-[10px] font-medium text-ink-muted">+{daySessions.length - 3} mais</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {sortedList.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-ink-muted">
              Nenhum atendimento de plano ativo neste período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-5 py-3 font-semibold">Data</th>
                    <th className="px-5 py-3 font-semibold">Hora</th>
                    <th className="px-5 py-3 font-semibold">Paciente</th>
                    <th className="px-5 py-3 font-semibold">Observação</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map((s) => (
                    <tr key={s.id} className="border-b border-ink/5 last:border-b-0 hover:bg-se-mist/50">
                      <td className="px-5 py-3 font-medium text-ink">
                        {new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{fmtTime(s.time) || '—'}</td>
                      <td className="px-5 py-3">
                        <Link to={`/admin/interesses/${s.lead_id}`} className="font-medium text-ink hover:text-se-violet">
                          {s.protocol_leads?.name ?? 'Paciente'}
                        </Link>
                      </td>
                      <td className="max-w-xs truncate px-5 py-3 text-ink-soft">{s.notes || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[s.status] ?? 'bg-se-sky text-se-teal'}`}>
                          {s.status === 'realizada' ? 'Realizada' : s.status === 'faltou' ? 'Faltou' : 'Agendada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
        <Users className="h-4 w-4" />
        {activeLeadIds.size} paciente{activeLeadIds.size === 1 ? '' : 's'} com plano ativo ·{' '}
        {activeSessions.length} atendimento{activeSessions.length === 1 ? '' : 's'}
      </div>
    </AdminLayout>
  )
}
