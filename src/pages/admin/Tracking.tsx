import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  Calendar,
  Filter,
  MousePointerClick,
  ScrollText,
  User,
} from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

interface TrackingEvent {
  id: string
  visitor_id: string
  session_id: string | null
  ref: string | null
  path: string
  event: string
  detail: Record<string, unknown> | null
  scroll_depth: number | null
  time_on_page_ms: number | null
  created_at: string
}

type Period = '7' | '30' | '90'

const PATH_LABELS: Record<string, string> = {
  '/': 'Página inicial',
  '/protocolo': 'Protocolo',
  '/pagamento': 'Pagamento',
  '/pagamento-combinado': 'Pagamento combinado',
  '/minha-area': 'Minha área',
  '/minha-area/login': 'Login',
  '/levantamento': 'Levantamento',
  '/identificacao': 'Identificação',
  '/consentimento': 'Consentimento',
  '/recepcao': 'Recepção',
  '/antes-de-comecar': 'Antes de começar',
  '/concluido': 'Concluído',
  '/obrigado': 'Obrigado',
}

function pathLabel(path: string) {
  const [clean] = path.split('?')
  return PATH_LABELS[clean] || clean
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-BR')
}

function fmtDuration(ms: number | null | undefined) {
  if (!ms || ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rest = s % 60
  return `${m}min${rest > 0 ? ` ${rest}s` : ''}`
}

function fmtSpan(ms: number | null | undefined) {
  if (!ms || ms <= 0) return '—'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}min`
  if (mins < 60 * 48) {
    const h = Math.floor(mins / 60)
    const rest = mins % 60
    return `${h}h${rest > 0 ? ` ${rest}min` : ''}`
  }
  const days = Math.floor(mins / (60 * 24))
  const restH = Math.floor((mins % (60 * 24)) / 60)
  return `${days}d${restH > 0 ? ` ${restH}h` : ''}`
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function refLabel(ref: string | null) {
  return ref || 'Acesso direto'
}

export function Tracking() {
  const [period, setPeriod] = useState<Period>('30')
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const since = new Date()
      since.setDate(since.getDate() - Number(period))
      const { data, error: err } = await supabase
        .from('tracking_events')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })
        .limit(5000)
      if (cancelled) return
      if (err) {
        setError(
          'Não foi possível carregar os eventos. Confirme que o arquivo supabase/add_tracking.sql foi executado no SQL Editor.',
        )
        setEvents([])
      } else {
        setEvents((data as TrackingEvent[]) ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [period])

  const stats = useMemo(() => {
    const visitors = new Set<string>()
    let pageViews = 0
    let diagStart = 0
    let diagResult = 0
    let emails = 0
    let paymentClicks = 0

    for (const e of events) {
      visitors.add(e.visitor_id)
      if (e.event === 'page_view') pageViews++
      else if (e.event === 'diagnostic_start') diagStart++
      else if (e.event === 'diagnostic_result') diagResult++
      else if (e.event === 'email_capture') emails++
      else if (e.event === 'payment_click') paymentClicks++
    }
    return {
      visitors: visitors.size,
      pageViews,
      diagStart,
      diagResult,
      emails,
      paymentClicks,
    }
  }, [events])

  const [funnelRef, setFunnelRef] = useState<'all' | 'direct' | string>('all')

  const funnelSources = useMemo(() => {
    const set = new Set<string>()
    for (const e of events) if (e.ref) set.add(e.ref)
    return Array.from(set).sort()
  }, [events])

  // Funil de conversão (item 6) — lógica aninhada:
  // cada etapa só conta quem completou TODAS as anteriores no período (funil
  // aberto, por visitante único). Assim as barras nunca sobem e as taxas
  // medem o que realmente importa: de X que chegaram, quantos seguiram.
  const funnelEvents = useMemo(() => {
    if (funnelRef === 'all') return events
    return events.filter((e) => (e.ref ?? null) === (funnelRef === 'direct' ? null : funnelRef))
  }, [events, funnelRef])

  const funnel = useMemo(() => {
    const defs = [
      { key: 'visitors', label: 'Visitantes', match: (e: TrackingEvent) => e.event === 'page_view' },
      { key: 'start', label: 'Iniciaram o diagnóstico', match: (e: TrackingEvent) => e.event === 'diagnostic_start' || e.event === 'diagnostic_resume' },
      { key: 'email', label: 'Deixaram o e-mail', match: (e: TrackingEvent) => e.event === 'email_capture' },
      { key: 'result', label: 'Concluíram o diagnóstico', match: (e: TrackingEvent) => e.event === 'diagnostic_result' },
      { key: 'payment', label: 'Clicaram no pagamento', match: (e: TrackingEvent) => e.event === 'payment_click' },
    ]
    // Primeira ocorrência de cada etapa por visitante (MIN por etapa)
    const firstByVisitor = new Map<string, (number | null)[]>()
    for (const e of funnelEvents) {
      const d = defs.find((x) => x.match(e))
      if (!d) continue
      let arr = firstByVisitor.get(e.visitor_id)
      if (!arr) {
        arr = Array(defs.length).fill(null)
        firstByVisitor.set(e.visitor_id, arr)
      }
      const t = new Date(e.created_at).getTime()
      const i = defs.indexOf(d)
      if (arr[i] === null || t < (arr[i] as number)) arr[i] = t
    }

    const counts = Array(defs.length).fill(0) as number[]
    const times = Array.from({ length: defs.length }, () => []) as number[][]
    for (const arr of firstByVisitor.values()) {
      if (arr[0] === null) continue // entra no funil só quem visitou o site (topo)
      for (let k = 0; k < defs.length && arr[k] !== null; k++) counts[k]++
      for (let k = 1; k < defs.length; k++) {
        if (arr[k - 1] !== null && arr[k] !== null) {
          const dt = (arr[k] as number) - (arr[k - 1] as number)
          if (dt > 0) times[k].push(dt)
        }
      }
    }

    const top = counts[0] || 1
    return defs.map((d, i) => {
      const prev = i === 0 ? null : counts[i - 1]
      const conversion = Math.round((counts[i] / top) * 100)
      const stepConv = prev && prev > 0 ? Math.round((counts[i] / prev) * 100) : null
      const drop = prev != null ? prev - counts[i] : null
      const dropRate = drop !== null && prev && prev > 0 ? Math.round((drop / prev) * 100) : null
      const medianMs = i === 0 ? null : median(times[i])
      return { key: d.key, label: d.label, count: counts[i], conversion, stepConv, drop, dropRate, medianMs }
    })
  }, [funnelEvents])

  // Gargalo com maior perda absoluta (impacto) e com menor conversão (taxa)
  const worstDropKey = useMemo(() => {
    let key: string | null = null
    let max = 0
    for (const s of funnel) {
      if (s.drop !== null && s.drop > max) {
        max = s.drop
        key = s.key
      }
    }
    return key
  }, [funnel])

  const worstRateKey = useMemo(() => {
    let key: string | null = null
    let lowest = 101
    for (const s of funnel) {
      if (s.key !== 'visitors' && s.stepConv !== null && s.stepConv < lowest) {
        lowest = s.stepConv
        key = s.key
      }
    }
    return key
  }, [funnel])

  // Abandono por pergunta do questionário (item 5)
  const questionFunnel = useMemo(() => {
    const startSet = new Set<string>() // quem iniciou
    const answersByVisitor = new Map<string, number[]>() // perguntas respondidas por visitante
    const resultSet = new Set<string>() // quem concluiu

    for (const e of events) {
      if (e.event === 'diagnostic_start' || e.event === 'diagnostic_resume') startSet.add(e.visitor_id)
      if (e.event === 'diagnostic_answer') {
        const q = (e.detail as { question?: number } | null)?.question ?? 0
        const arr = answersByVisitor.get(e.visitor_id) ?? []
        arr.push(q)
        answersByVisitor.set(e.visitor_id, arr)
      }
      if (e.event === 'diagnostic_result') resultSet.add(e.visitor_id)
    }

    // Por pergunta: quantos responderam e quantos NÃO seguiram para a próxima nem concluíram.
    const rows = []
    for (let i = 1; i <= 5; i++) {
      let answered = 0
      let dropped = 0
      for (const [visitor, qs] of answersByVisitor) {
        if (!qs.includes(i)) continue
        answered++
        const wentFurther = i < 5 ? qs.includes(i + 1) : false
        if (!wentFurther && !resultSet.has(visitor)) dropped++
      }
      rows.push({ question: i, answered, dropped })
    }
    const completed = resultSet.size
    const started = startSet.size
    return { started, completed, rows }
  }, [events])

  // Visitas e conversões por link de origem (?ref=)
  const byRef = useMemo(() => {
    const map = new Map<
      string,
      { visits: number; diagStart: number; emails: number; paymentClicks: number; last: string }
    >()
    const visitorsByRef = new Map<string, Set<string>>()
    for (const e of events) {
      const key = e.ref || ''
      const row =
        map.get(key) ??
        { visits: 0, diagStart: 0, emails: 0, paymentClicks: 0, last: e.created_at }
      if (e.event === 'page_view') row.visits++
      else if (e.event === 'diagnostic_start') row.diagStart++
      else if (e.event === 'email_capture') row.emails++
      else if (e.event === 'payment_click') row.paymentClicks++
      if (e.created_at > row.last) row.last = e.created_at
      map.set(key, row)
      if (e.event === 'page_view') {
        const set = visitorsByRef.get(key) ?? new Set<string>()
        set.add(e.visitor_id)
        visitorsByRef.set(key, set)
      }
    }
    return Array.from(map.entries())
      .map(([key, row]) => ({
        ref: key || null,
        unique: visitorsByRef.get(key)?.size ?? 0,
        ...row,
      }))
      .sort((a, b) => b.visits - a.visits)
  }, [events])

  // Onde os usuários param: última página vista por sessão + métricas por página
  const pages = useMemo(() => {
    interface PageRow {
      path: string
      views: number
      unique: number
      scrollTotal: number
      scrollCount: number
      timeTotal: number
      timeCount: number
      droppedHere: number
    }
    const map = new Map<string, PageRow>()
    const lastPathBySession = new Map<string, { path: string; at: string }>()
    const visitorsByPath = new Map<string, Set<string>>()

    for (const e of events) {
      if (e.event !== 'page_view' && e.event !== 'page_leave') continue
      const row =
        map.get(e.path) ??
        {
          path: e.path,
          views: 0,
          unique: 0,
          scrollTotal: 0,
          scrollCount: 0,
          timeTotal: 0,
          timeCount: 0,
          droppedHere: 0,
        }
      if (e.event === 'page_view') {
        row.views++
        const set = visitorsByPath.get(e.path) ?? new Set<string>()
        set.add(e.visitor_id)
        visitorsByPath.set(e.path, set)
      } else {
        if (typeof e.scroll_depth === 'number') {
          row.scrollTotal += e.scroll_depth
          row.scrollCount++
        }
        if (typeof e.time_on_page_ms === 'number') {
          row.timeTotal += e.time_on_page_ms
          row.timeCount++
        }
      }
      map.set(e.path, row)

      const sid = e.session_id ?? e.visitor_id
      const prev = lastPathBySession.get(sid)
      if (!prev || e.created_at >= prev.at) {
        lastPathBySession.set(sid, { path: e.path, at: e.created_at })
      }
    }

    for (const last of lastPathBySession.values()) {
      const row = map.get(last.path)
      if (row) row.droppedHere++
    }

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        unique: visitorsByPath.get(row.path)?.size ?? 0,
        avgScroll:
          row.scrollCount > 0 ? Math.round(row.scrollTotal / row.scrollCount) : null,
        avgTime: row.timeCount > 0 ? Math.round(row.timeTotal / row.timeCount) : null,
      }))
      .sort((a, b) => b.views - a.views)
  }, [events])

  // Jornada recente por sessão
  const journeys = useMemo(() => {
    const map = new Map<
      string,
      { paths: string[]; emails: string[]; started: string; last: string }
    >()
    for (const e of events) {
      const sid = e.session_id ?? e.visitor_id
      const row = map.get(sid) ?? { paths: [], emails: [], started: e.created_at, last: e.created_at }
      if (e.event === 'page_view') {
        const label = pathLabel(e.path)
        if (row.paths[row.paths.length - 1] !== label) row.paths.push(label)
      } else if (e.event === 'email_capture') {
        const email = (e.detail as { email?: string } | null)?.email
        if (email && !row.emails.includes(email)) row.emails.push(email)
      }
      if (e.created_at > row.last) row.last = e.created_at
      if (e.created_at < row.started) row.started = e.created_at
      map.set(sid, row)
    }
    return Array.from(map.entries())
      .map(([sid, row]) => ({ sid, ...row }))
      .sort((a, b) => (a.last < b.last ? 1 : -1))
      .slice(0, 30)
  }, [events])

  const emailCaptures = useMemo(() => {
    return events
      .filter((e) => e.event === 'email_capture')
      .map((e) => ({
        id: e.id,
        email: ((e.detail as { email?: string } | null)?.email ?? '') as string,
        ref: e.ref,
        path: e.path,
        created_at: e.created_at,
      }))
      .reverse()
  }, [events])

  return (
    <AdminLayout>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-8">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-se-violet md:text-[11px]">
            SynaptEssence360®
          </div>
          <h1 className="mt-0.5 font-display text-2xl font-semibold text-ink md:text-3xl">
            Tracking do site
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            De onde vem cada visitante, onde ele para e o que faz antes de fechar a página.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-ink-muted" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-sm text-ink focus:border-se-violet focus:outline-none"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
        </div>
      ) : (
        <>
          {/* ─── CARDS ─── */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="card p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                <User className="h-3 w-3" /> Visitantes
              </div>
              <div className="mt-1 font-display text-2xl font-semibold text-se-violet">
                {fmtInt(stats.visitors)}
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                <ScrollText className="h-3 w-3" /> Páginas vistas
              </div>
              <div className="mt-1 font-display text-2xl font-semibold text-ink">
                {fmtInt(stats.pageViews)}
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                <Activity className="h-3 w-3" /> Diagnósticos
              </div>
              <div className="mt-1 font-display text-2xl font-semibold text-se-teal">
                {fmtInt(stats.diagStart)}
                <span className="ml-1 text-sm font-medium text-ink-muted">
                  → {fmtInt(stats.diagResult)} concluídos
                </span>
              </div>
            </div>
            <div className="card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                E-mails capturados
              </div>
              <div className="mt-1 font-display text-2xl font-semibold text-se-violet">
                {fmtInt(stats.emails)}
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                <MousePointerClick className="h-3 w-3" /> Pgto clicado
              </div>
              <div className="mt-1 font-display text-2xl font-semibold text-se-teal">
                {fmtInt(stats.paymentClicks)}
              </div>
            </div>
          </div>

          {/* ─── FUNIL DE CONVERSÃO ─── */}
          <div className="card mt-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  Funil de conversão
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Cada etapa conta quem completou todas as anteriores (funil aberto,
                  visitante único, no período selecionado).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-ink-muted" />
                <select
                  value={funnelRef}
                  onChange={(e) => setFunnelRef(e.target.value)}
                  className="rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-sm text-ink focus:border-se-violet focus:outline-none"
                >
                  <option value="all">Todas as origens</option>
                  <option value="direct">Acesso direto</option>
                  {funnelSources.map((ref) => (
                    <option key={ref} value={ref}>{ref}</option>
                  ))}
                </select>
              </div>
            </div>

            {funnel[0].count === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-ink-muted">
                Nenhuma visita nesta origem no período.
              </div>
            ) : (
              <div className="px-5 py-5">
                {/* Insights */}
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-ink/5 bg-se-mist/50 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                      Conversão geral
                    </div>
                    <div className="mt-1 font-display text-2xl font-semibold text-se-violet">
                      {funnel[funnel.length - 1].conversion}%
                    </div>
                    <div className="mt-1 text-[11px] text-ink-muted">
                      {fmtInt(funnel[funnel.length - 1].count)} chegaram ao pagamento
                    </div>
                  </div>
                  {worstRateKey && (() => {
                    const gi = funnel.findIndex((s) => s.key === worstRateKey)
                    return (
                      <div className="rounded-2xl border border-ink/5 bg-se-mist/50 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                          Maior gargalo (taxa)
                        </div>
                        <div className="mt-1 font-display text-lg font-semibold text-red-600">
                          {funnel[gi].stepConv}%
                        </div>
                        <div className="mt-1 text-[11px] text-ink-muted">
                          só seguiram de "{funnel[gi - 1]?.label}" para "{funnel[gi].label}"
                        </div>
                      </div>
                    )
                  })()}
                  {worstDropKey && (() => {
                    const di = funnel.findIndex((s) => s.key === worstDropKey)
                    return (
                      <div className="rounded-2xl border border-ink/5 bg-se-mist/50 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                          Maior perda (pessoas)
                        </div>
                        <div className="mt-1 font-display text-lg font-semibold text-ink">
                          −{fmtInt(funnel[di].drop ?? 0)}
                        </div>
                        <div className="mt-1 text-[11px] text-ink-muted">
                          entre "{funnel[di - 1]?.label}" e "{funnel[di].label}"
                        </div>
                      </div>
                    )
                  })()}
                  <div className="rounded-2xl border border-ink/5 bg-se-mist/50 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                      Tempo mediano até o pagamento
                    </div>
                    <div className="mt-1 font-display text-lg font-semibold text-ink">
                      {fmtSpan(funnel[funnel.length - 1].medianMs)}
                    </div>
                    <div className="mt-1 text-[11px] text-ink-muted">
                      do início ao clique no pagamento
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {funnel.map((s, i) => {
                    const width = Math.max(6, s.conversion)
                    const isWorstAbs = s.key === worstDropKey
                    const isWorstRate = s.key === worstRateKey
                    return (
                      <div key={s.key} className="rounded-xl border border-ink/5 bg-se-mist/40 p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-20 shrink-0 text-right">
                            <div className="font-display text-lg font-semibold text-ink">
                              {fmtInt(s.count)}
                            </div>
                            <div className="text-[10px] text-ink-muted">{s.conversion}%</div>
                          </div>
                          <div className="h-8 flex-1 overflow-hidden rounded-lg bg-se-mist">
                            <div
                              className={`flex h-full items-center overflow-hidden rounded-lg whitespace-nowrap px-3 text-[11px] font-semibold text-white ${
                                i === funnel.length - 1
                                  ? 'bg-gradient-to-r from-se-teal to-se-violet'
                                  : 'bg-se-violet/70'
                              }`}
                              style={{ width: `${width}%`, minWidth: '110px' }}
                            >
                              {s.label}
                            </div>
                          </div>
                          <div className="w-32 shrink-0 text-left">
                            {i === 0 ? (
                              <span className="inline-flex rounded-full bg-se-lavender px-2.5 py-1 text-xs font-semibold text-se-violet">
                                Base
                              </span>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink">
                                  {s.stepConv !== null ? `${s.stepConv}%` : '—'}
                                </span>
                                <div className="mt-0.5 text-[10px] text-ink-muted">dos anteriores</div>
                              </>
                            )}
                          </div>
                        </div>
                        {i > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[5.5rem]">
                            <span className="text-xs text-ink-muted">
                              {s.drop !== null && s.drop > 0 ? (
                                <>
                                  <strong className={isWorstAbs ? 'text-red-600' : 'text-se-violet'}>
                                    −{fmtInt(s.drop)}
                                  </strong>{' '}
                                  {s.drop === 1 ? 'desistiu' : 'desistiram'} (−{s.dropRate}%)
                                  {isWorstAbs && (
                                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                      <ArrowDownRight className="h-2.5 w-2.5" /> Maior desistência
                                    </span>
                                  )}
                                </>
                              ) : (
                                'Sem queda'
                              )}
                            </span>
                            {s.medianMs !== null && (
                              <span className="text-[11px] text-ink-muted">
                                Mediana de {fmtSpan(s.medianMs)} até a próxima etapa
                              </span>
                            )}
                            {isWorstRate && i > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                Gargalo de conversão
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="border-t border-ink/5 px-5 py-3 text-xs text-ink-muted">
              Lógica: cada visitante conta 1× apenas se percorreu <strong>todas</strong> as etapas
              anteriores até a barra (funil aberto, no período). Barra = % sobre o topo. Badge à
              direita = conversão sobre a etapa anterior. Use o filtro de origem para comparar campanhas.
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* ─── POR LINK ─── */}
            <div className="card overflow-hidden">
              <div className="border-b border-ink/5 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-ink">
                  Visitas por link de origem
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Cada link compartilhado carrega <code className="rounded bg-ink/5 px-1">?ref=</code>{' '}
                  para identificar a origem.
                </p>
              </div>
              {byRef.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-ink-muted">
                  Sem visitas no período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                        <th className="px-5 py-3 font-semibold">Link</th>
                        <th className="px-3 py-3 font-semibold">Visitantes</th>
                        <th className="px-3 py-3 font-semibold">Visitas</th>
                        <th className="px-3 py-3 font-semibold">Diagnósticos</th>
                        <th className="px-3 py-3 font-semibold">E-mails</th>
                        <th className="px-5 py-3 font-semibold">Pgto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byRef.map((row) => (
                        <tr key={row.ref ?? 'direct'} className="border-b border-ink/5 last:border-b-0">
                          <td className="px-5 py-3">
                            <span className="font-medium text-ink">{refLabel(row.ref)}</span>
                          </td>
                          <td className="px-3 py-3 text-ink-soft">{fmtInt(row.unique)}</td>
                          <td className="px-3 py-3 text-ink-soft">{fmtInt(row.visits)}</td>
                          <td className="px-3 py-3 text-ink-soft">{fmtInt(row.diagStart)}</td>
                          <td className="px-3 py-3 text-ink-soft">{fmtInt(row.emails)}</td>
                          <td className="px-5 py-3 text-ink-soft">{fmtInt(row.paymentClicks)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── E-MAILS CAPTURADOS ─── */}
            <div className="card overflow-hidden">
              <div className="border-b border-ink/5 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-ink">
                  E-mails antes do protocolo
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Capturados antes das 5 perguntas do diagnóstico.
                </p>
              </div>
              {emailCaptures.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-ink-muted">
                  Nenhum e-mail capturado no período.
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto">
                  {emailCaptures.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-3 border-b border-ink/5 px-5 py-3 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-ink">{row.email}</div>
                        <div className="mt-0.5 text-[11px] text-ink-muted">
                          {pathLabel(row.path)} · {refLabel(row.ref)}
                        </div>
                      </div>
                      <div className="shrink-0 text-[11px] text-ink-muted">
                        {fmtDateTime(row.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── ONDE PARAM ─── */}
          <div className="card mt-6 overflow-hidden">
            <div className="border-b border-ink/5 px-5 py-4">
              <h2 className="font-display text-lg font-semibold text-ink">
                Onde os usuários param
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Rolagem média e tempo médio por página, e quantas sessões terminaram
                naquela página.
              </p>
            </div>
            {pages.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-ink-muted">
                Sem dados de páginas no período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                      <th className="px-5 py-3 font-semibold">Página</th>
                      <th className="px-3 py-3 font-semibold">Visitas</th>
                      <th className="px-3 py-3 font-semibold">Visitantes</th>
                      <th className="px-3 py-3 font-semibold">Rolagem média</th>
                      <th className="px-3 py-3 font-semibold">Tempo médio</th>
                      <th className="px-5 py-3 font-semibold">Saíram aqui</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((row) => (
                      <tr key={row.path} className="border-b border-ink/5 last:border-b-0">
                        <td className="px-5 py-3 font-medium text-ink">{pathLabel(row.path)}</td>
                        <td className="px-3 py-3 text-ink-soft">{fmtInt(row.views)}</td>
                        <td className="px-3 py-3 text-ink-soft">{fmtInt(row.unique)}</td>
                        <td className="px-3 py-3 text-ink-soft">
                          {row.avgScroll !== null ? (
                            <span className="inline-flex items-center gap-1">
                              <ArrowDownRight className="h-3.5 w-3.5 text-se-violet" />
                              {row.avgScroll}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-3 text-ink-soft">{fmtDuration(row.avgTime)}</td>
                        <td className="px-5 py-3">
                          {row.droppedHere > 0 ? (
                            <span className="inline-flex rounded-full bg-se-lavender px-2.5 py-0.5 text-[11px] font-semibold text-se-violet">
                              {fmtInt(row.droppedHere)} sessões
                            </span>
                          ) : (
                            <span className="text-xs text-ink-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ─── ABANDONO POR PERGUNTA ─── */}
          <div className="card mt-6 overflow-hidden">
            <div className="border-b border-ink/5 px-5 py-4">
              <h2 className="font-display text-lg font-semibold text-ink">
                Abandono no questionário
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Quantas pessoas chegaram a cada pergunta e quantas desistiram antes de
                avançar. Visita com maior desistência vira prioridade de revisão.
              </p>
            </div>
            {questionFunnel.started === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-ink-muted">
                Nenhum diagnóstico iniciado no período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                      <th className="px-5 py-3 font-semibold">Pergunta</th>
                      <th className="px-3 py-3 font-semibold">Responderam</th>
                      <th className="px-3 py-3 font-semibold">Desistiram antes da próxima</th>
                      <th className="px-5 py-3 font-semibold">Barra de desistência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // destaca a pergunta com MAIOR desistência
                      const maxDropped = Math.max(...questionFunnel.rows.map((r) => r.dropped), 0)
                      return questionFunnel.rows.map((row) => {
                        const pct = questionFunnel.started > 0 ? Math.round((row.dropped / questionFunnel.started) * 100) : 0
                        const worst = maxDropped > 0 && row.dropped === maxDropped
                        return (
                          <tr key={row.question} className="border-b border-ink/5 last:border-b-0">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-ink">Pergunta {row.question}</span>
                                {worst && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                    <Filter className="h-2.5 w-2.5" /> Maior desistência
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-ink-soft">{fmtInt(row.answered)}</td>
                            <td className="px-3 py-3 text-ink-soft">
                              <span className="font-semibold text-se-violet">{fmtInt(row.dropped)}</span>
                              <span className="ml-1 text-xs text-ink-muted">({pct}%)</span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="h-2 w-40 overflow-hidden rounded-full bg-se-mist">
                                <div
                                  className={`h-full rounded-full ${worst ? 'bg-red-400' : 'bg-se-violet/50'}`}
                                  style={{ width: `${Math.max(row.dropped > 0 ? 6 : 0, pct)}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-ink/5">
                      <td className="px-5 py-3 text-xs font-medium text-ink">
                        Iniciaram: {fmtInt(questionFunnel.started)}
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-muted">Concluíram: {fmtInt(questionFunnel.completed)}</td>
                      <td className="px-3 py-3 text-xs text-ink-muted">
                        Taxa de conclusão:{' '}
                        {questionFunnel.started > 0
                          ? Math.round((questionFunnel.completed / questionFunnel.started) * 100)
                          : 0}
                        %
                      </td>
                      <td className="px-5 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ─── JORNADA RECENTE ─── */}
          <div className="card mt-6 overflow-hidden">
            <div className="border-b border-ink/5 px-5 py-4">
              <h2 className="font-display text-lg font-semibold text-ink">
                Jornada recente
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Sequência de páginas de cada visita nas últimas horas/dias.
              </p>
            </div>
            {journeys.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-ink-muted">
                Sem visitas no período.
              </div>
            ) : (
              <div className="divide-y divide-ink/5">
                {journeys.map((j) => (
                  <div key={j.sid} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <span className="w-28 shrink-0 text-[11px] text-ink-muted">
                      {fmtDateTime(j.last)}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {j.paths.map((p, i) => (
                        <span key={`${j.sid}-${i}`} className="inline-flex items-center gap-1.5">
                          {i > 0 && <span className="text-ink-muted">→</span>}
                          <span className="rounded-full bg-se-mist px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                            {p}
                          </span>
                        </span>
                      ))}
                    </div>
                    {j.emails.map((email) => (
                      <span
                        key={`${j.sid}-mail`}
                        className="ml-auto rounded-full bg-se-teal/10 px-2.5 py-0.5 text-[11px] font-semibold text-se-teal"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  )
}
