import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  Calendar,
  Filter,
  Flame,
  Lightbulb,
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

// ─── Funil de conversão ────────────────────────────────────────────────────
// `requires` = índices das etapas anteriores que a etapa exige (apenas quando
// presentes nos dados do visitante). Assim uma etapa opcional — como pular o
// passo de e-mail — não zera as etapas seguintes, que era o bug que deixava os
// percentuais do funil sempre em 0.
type FunnelStage = {
  key: string
  label: string
  requires: number[]
  match: (e: TrackingEvent) => boolean
}

const FUNNEL_STAGES: FunnelStage[] = [
  { key: 'visitors', label: 'Visitantes', requires: [], match: (e) => e.event === 'page_view' },
  {
    key: 'start',
    label: 'Iniciaram o diagnóstico',
    requires: [0],
    match: (e) => e.event === 'diagnostic_start' || e.event === 'diagnostic_resume',
  },
  { key: 'result', label: 'Concluíram o diagnóstico', requires: [1], match: (e) => e.event === 'diagnostic_result' },
  { key: 'payment', label: 'Clicaram no pagamento', requires: [1], match: (e) => e.event === 'payment_click' },
]

// Próxima ação sugerida conforme o gargalo de conversão detectado
const FUNNEL_ACTIONS: Record<string, string> = {
  start: 'reforce a proposta e o CTA na página inicial para mais visitantes iniciarem o diagnóstico.',
  result: 'simplifique o questionário ou o passo de e-mail — quem inicia não está concluindo.',
  payment: 'aproxime o CTA de pagamento da tela de resultado — concluem mas não clicam em pagar.',
}

// Nomes curtos para os rótulos das colunas do funil
const FUNNEL_SHORT: Record<string, string> = {
  visitors: 'Visitantes',
  start: 'Iniciaram',
  result: 'Concluíram',
  payment: 'Pagamento',
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
      // O Supabase devolve no máx. 1000 linhas por requisição. Antes a consulta era
      // ascendente + limit, então só vinham os eventos MAIS ANTIGOS e os e-mails
      // recentes sumiam do painel. Agora pagina do mais novo para o mais antigo.
      const PAGE = 1000
      const MAX = 30000
      const all: TrackingEvent[] = []
      let err: { message: string } | null = null
      for (let from = 0; from < MAX; from += PAGE) {
        const { data, error: e } = await supabase
          .from('tracking_events')
          .select('*')
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1)
        if (cancelled) return
        if (e) {
          err = e
          break
        }
        const rows = (data as TrackingEvent[]) ?? []
        all.push(...rows)
        if (rows.length < PAGE) break
      }
      if (cancelled) return
      if (err && all.length === 0) {
        setError(
          'Não foi possível carregar os eventos. Confirme que o arquivo supabase/add_tracking.sql foi executado no SQL Editor.',
        )
        setEvents([])
      } else {
        setEvents(all.reverse())
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
    let paymentClicks = 0

    for (const e of events) {
      if (e.event === 'page_view') {
        visitors.add(e.visitor_id)
        pageViews++
      } else if (e.event === 'diagnostic_start' || e.event === 'diagnostic_resume') diagStart++
      else if (e.event === 'diagnostic_result') diagResult++
      else if (e.event === 'payment_click') paymentClicks++
    }
    return {
      // mesma base do topo do funil (quem teve page_view) para os números baterem
      visitors: visitors.size,
      pageViews,
      diagStart,
      diagResult,
      paymentClicks,
    }
  }, [events])

  const [funnelRef, setFunnelRef] = useState<'all' | 'direct' | string>('all')

  const funnelSources = useMemo(() => {
    const set = new Set<string>()
    for (const e of events) if (e.ref) set.add(e.ref)
    return Array.from(set).sort()
  }, [events])

  // Eventos recortados pela origem selecionada — base de todo o funil.
  const funnelEvents = useMemo(() => {
    if (funnelRef === 'all') return events
    return events.filter((e) => (e.ref ?? null) === (funnelRef === 'direct' ? null : funnelRef))
  }, [events, funnelRef])

  const funnel = useMemo(() => {
    const defs = FUNNEL_STAGES
    // Coleta a primeira vez que cada etapa foi atingida por visitante
    const firstByVisitor = new Map<string, (number | null)[]>()
    
    for (const e of funnelEvents) {
      const i = defs.findIndex((x) => x.match(e))
      if (i === -1) continue
      let arr = firstByVisitor.get(e.visitor_id)
      if (!arr) {
        arr = Array(defs.length).fill(null)
        firstByVisitor.set(e.visitor_id, arr)
      }
      const t = new Date(e.created_at).getTime()
      if (arr[i] === null || t < (arr[i] as number)) arr[i] = t
    }

    const counts = Array(defs.length).fill(0)
    const times = Array.from({ length: defs.length }, () => []) as number[][]
    
    for (const arr of firstByVisitor.values()) {
      // Se tiver uma etapa avançada, preenche as anteriores para o funil ser fechado
      let highest = -1
      for (let i = defs.length - 1; i >= 0; i--) {
        if (arr[i] !== null) {
          highest = i
          break
        }
      }
      
      if (highest >= 0) {
        for (let i = 0; i <= highest; i++) counts[i]++
        // Tempo do início até a conversão
        if (arr[0] !== null) {
          for (let i = 1; i <= highest; i++) {
            if (arr[i] !== null) times[i].push((arr[i] as number) - (arr[0] as number))
          }
        }
      }
    }

    const top = counts[0] || 1
    return defs.map((d, i) => {
      const prev = i === 0 ? null : counts[i - 1]
      const conversion = Math.round((counts[i] / top) * 100)
      const stepConv = prev !== null && prev > 0 ? Math.round((counts[i] / prev) * 100) : null
      const drop = prev !== null ? prev - counts[i] : 0
      const dropRate = prev !== null && prev > 0 && drop > 0 ? Math.round((drop / prev) * 100) : null
      const medianMs = i === 0 ? null : median(times[i])
      return { key: d.key, label: d.label, count: counts[i], conversion, stepConv, drop, dropRate, gain: 0, medianMs, baseLabel: 'Visitantes' }
    })
  }, [funnelEvents])

  // E-mails capturados na mesma base do funil (respeita o filtro de origem)
  const emailCaptured = useMemo(() => {
    const set = new Set<string>()
    for (const e of funnelEvents) if (e.event === 'email_capture') set.add(e.visitor_id)
    return set.size
  }, [funnelEvents])

  const emailPct =
    funnel[1].count > 0 ? Math.min(100, Math.round((emailCaptured / funnel[1].count) * 100)) : null

  // Gargalo com maior perda absoluta (impacto) e com menor conversão (taxa)
  const worstDropKey = useMemo(() => {
    let key: string | null = null
    let max = 0
    for (const s of funnel) {
      if (s.drop > max) {
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

  // Leitura inteligente: frases geradas a partir dos números do funil
  const funnelReads = useMemo(() => {
    const out: string[] = []
    const top = funnel[0].count
    if (top === 0) return out
    const pay = funnel[funnel.length - 1]
    out.push(`${pay.conversion}% dos visitantes chegaram em "${pay.label}" (${fmtInt(pay.count)} de ${fmtInt(top)}).`)
    const gi = worstRateKey ? funnel.findIndex((s) => s.key === worstRateKey) : -1
    if (gi > 0) {
      const s = funnel[gi]
      out.push(
        `Maior gargalo: só ${s.stepConv}% seguem de "${funnel[gi - 1].label}" para "${s.label}"${
          s.drop > 0 ? ` — ${fmtInt(s.drop)} pessoas perdidas` : ''
        }.`,
      )
      const action = FUNNEL_ACTIONS[s.key]
      if (action) out.push(`Ação sugerida: ${action}`)
    }
    if (pay.medianMs !== null) out.push(`Tempo mediano de quem completou: ${fmtSpan(pay.medianMs)}.`)
    return out.slice(0, 4)
  }, [funnel, worstRateKey])

  // Abandono por pergunta do questionário
  const questionFunnel = useMemo(() => {
    const startSet = new Set<string>() // quem iniciou
    const answersByVisitor = new Map<string, number[]>() // perguntas respondidas por visitante
    const resultSet = new Set<string>() // quem concluiu
    let maxQuestion = 0

    for (const e of events) {
      if (e.event === 'diagnostic_start' || e.event === 'diagnostic_resume') startSet.add(e.visitor_id)
      if (e.event === 'diagnostic_answer') {
        const q = (e.detail as { question?: number } | null)?.question ?? 0
        if (q > maxQuestion) maxQuestion = q
        const arr = answersByVisitor.get(e.visitor_id) ?? []
        arr.push(q)
        answersByVisitor.set(e.visitor_id, arr)
      }
      if (e.event === 'diagnostic_result') resultSet.add(e.visitor_id)
    }

    // Nº de perguntas descoberto dos dados (não hardcoded).
    const total = Math.max(maxQuestion, 1)
    // Por pergunta: quantos responderam e quantos NÃO seguiram para a próxima nem concluíram.
    const rows = []
    let answeredTotal = 0
    for (let i = 1; i <= total; i++) {
      let answered = 0
      let dropped = 0
      for (const [visitor, qs] of answersByVisitor) {
        if (!qs.includes(i)) continue
        answered++
        const wentFurther = (i < total ? qs.includes(i + 1) : false) || resultSet.has(visitor)
        if (!wentFurther) dropped++
      }
      answeredTotal += answered
      // % de quem RESpondeu esta pergunta e parou — base correta, nunca > 100%
      const pct = answered > 0 ? Math.round((dropped / answered) * 100) : 0
      rows.push({ question: i, answered, dropped, pct })
    }
    const completed = resultSet.size
    const started = startSet.size
    const rate = started > 0 ? Math.min(100, Math.round((completed / started) * 100)) : 0
    return { started, completed, answeredTotal, total, rate, rows }
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
      else if (e.event === 'diagnostic_start' || e.event === 'diagnostic_resume') row.diagStart++
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
  }, [events])

  // Paginação da jornada recente
  const JOURNEY_PAGE_SIZE = 8
  const [journeyPage, setJourneyPage] = useState(1)
  const journeyTotalPages = Math.max(1, Math.ceil(journeys.length / JOURNEY_PAGE_SIZE))
  const journeySafePage = Math.min(journeyPage, journeyTotalPages)
  const pagedJourneys = journeys.slice(
    (journeySafePage - 1) * JOURNEY_PAGE_SIZE,
    journeySafePage * JOURNEY_PAGE_SIZE,
  )

  const emailCaptures = useMemo(() => {
    // Deduplica por e-mail (mantém a captura mais recente)
    const seen = new Set<string>()
    const out: { id: string; email: string; ref: string | null; path: string; created_at: string }[] = []
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i]
      if (e.event !== 'email_capture' && e.event !== 'identify') continue
      const email = String((e.detail as { email?: string } | null)?.email ?? '').toLowerCase()
      if (!email || seen.has(email)) continue
      seen.add(email)
      out.push({ id: e.id, email, ref: e.ref, path: e.path, created_at: e.created_at })
    }
    return out
  }, [events])

  // ─── Inteligência de leads: score de intenção por visitante ────────────────
  const leadIntel = useMemo(() => {
    interface V {
      visitor: string
      email: string | null
      score: number
      sessions: Set<string>
      pages: number
      timeMs: number
      maxScroll: number
      answers: number
      started: boolean
      finished: boolean
      recommendation: string | null
      payment: boolean
      abandonedAt: number | null
      channel: string
      device: string | null
      ref: string | null
      last: string
    }
    const map = new Map<string, V>()
    for (const e of events) {
      let v = map.get(e.visitor_id)
      if (!v) {
        v = {
          visitor: e.visitor_id, email: null, score: 0, sessions: new Set(), pages: 0, timeMs: 0,
          maxScroll: 0, answers: 0, started: false, finished: false, recommendation: null,
          payment: false, abandonedAt: null, channel: e.ref ? 'Link compartilhado' : 'Direto',
          device: null, ref: e.ref, last: e.created_at,
        }
        map.set(e.visitor_id, v)
      }
      const d = (e.detail ?? {}) as Record<string, unknown>
      if (typeof d.email === 'string' && d.email) v.email = d.email.toLowerCase()
      if (e.session_id) v.sessions.add(e.session_id)
      if (e.created_at > v.last) v.last = e.created_at
      if (d.session_start) {
        if (typeof d.channel === 'string') v.channel = d.channel
        if (typeof d.device === 'string') v.device = d.device
      }
      switch (e.event) {
        case 'page_view': v.pages++; break
        case 'page_leave':
          v.timeMs += e.time_on_page_ms ?? 0
          v.maxScroll = Math.max(v.maxScroll, e.scroll_depth ?? 0)
          break
        case 'diagnostic_start': case 'diagnostic_resume': v.started = true; break
        case 'diagnostic_answer': v.answers++; break
        case 'diagnostic_abandon': v.abandonedAt = (d.at_question as number) ?? null; break
        case 'diagnostic_result':
          v.finished = true
          v.abandonedAt = null
          if (typeof d.recommendation === 'string') v.recommendation = d.recommendation
          break
        case 'payment_click': v.payment = true; break
      }
    }

    const now = Date.now()
    const list = Array.from(map.values()).map((v) => {
      // Pesos: comportamento de compra > identificação > engajamento
      let s = 0
      s += Math.min(v.pages, 8) * 2
      s += Math.min(Math.round(v.timeMs / 60000), 10) * 2
      s += v.maxScroll >= 75 ? 6 : v.maxScroll >= 50 ? 3 : 0
      s += v.sessions.size > 1 ? Math.min(v.sessions.size - 1, 3) * 6 : 0
      s += v.started ? 8 : 0
      s += Math.min(v.answers, 5) * 2
      s += v.finished ? 15 : 0
      s += v.email ? 15 : 0
      s += v.payment ? 25 : 0
      s += v.recommendation === 'integral' ? 6 : v.recommendation === 'transition' ? 3 : 0
      // Recência: decai após 3 dias sem atividade
      const days = (now - new Date(v.last).getTime()) / 86400000
      if (days > 3) s = Math.round(s * Math.max(0.4, 1 - (days - 3) / 30))
      const score = Math.min(100, s)
      const temp: 'quente' | 'morno' | 'frio' = score >= 55 ? 'quente' : score >= 28 ? 'morno' : 'frio'

      // Próxima melhor ação
      let action = 'Nutrir com conteúdo'
      if (v.payment) action = 'Clicou no pagamento — contatar hoje para fechar'
      else if (v.finished && v.email) action = `Enviar proposta (${v.recommendation ?? 'indicação'})`
      else if (v.abandonedAt && v.email) action = `Lembrete: parou na pergunta ${v.abandonedAt}`
      else if (v.started && v.email) action = 'Convidar para concluir o diagnóstico'
      else if (v.sessions.size > 1 && !v.email) action = 'Visitante recorrente — reforçar captura de e-mail'
      return { ...v, sessions: v.sessions.size, score, temp, action }
    })

    const identified = list.filter((v) => v.email).sort((a, b) => b.score - a.score)
    const hotAnon = list.filter((v) => !v.email && v.temp !== 'frio').length

    // Insights automáticos
    const insights: string[] = []
    const byChannel = new Map<string, { n: number; conv: number }>()
    const byDevice = new Map<string, { n: number; conv: number }>()
    const hours = Array(24).fill(0) as number[]
    for (const v of list) {
      const conv = v.email || v.payment ? 1 : 0
      const c = byChannel.get(v.channel) ?? { n: 0, conv: 0 }
      c.n++; c.conv += conv; byChannel.set(v.channel, c)
      if (v.device) {
        const dv = byDevice.get(v.device) ?? { n: 0, conv: 0 }
        dv.n++; dv.conv += conv; byDevice.set(v.device, dv)
      }
    }
    for (const e of events) if (e.event === 'email_capture' || e.event === 'payment_click') hours[new Date(e.created_at).getHours()]++

    const best = (m: Map<string, { n: number; conv: number }>, minN: number) =>
      Array.from(m.entries())
        .filter(([, x]) => x.n >= minN)
        .map(([k, x]) => ({ k, rate: Math.round((x.conv / x.n) * 100), n: x.n }))
        .sort((a, b) => b.rate - a.rate)
    const ch = best(byChannel, 3)
    if (ch.length > 0 && ch[0].rate > 0) insights.push(`Canal que mais converte: ${ch[0].k} (${ch[0].rate}% viram lead, ${ch[0].n} visitantes).`)
    if (ch.length > 1 && ch[ch.length - 1].n >= 10 && ch[ch.length - 1].rate === 0) insights.push(`${ch[ch.length - 1].k} traz tráfego (${ch[ch.length - 1].n}) mas nenhum lead — revise a mensagem/oferta desse canal.`)
    const dv = best(byDevice, 3)
    if (dv.length > 1 && dv[0].rate - dv[dv.length - 1].rate >= 10) insights.push(`Conversão em ${dv[0].k} (${dv[0].rate}%) supera ${dv[dv.length - 1].k} (${dv[dv.length - 1].rate}%) — teste a experiência em ${dv[dv.length - 1].k}.`)
    const peak = hours.indexOf(Math.max(...hours))
    if (hours[peak] >= 2) insights.push(`Pico de conversões por volta das ${peak}h — bom horário para publicar e enviar e-mails.`)
    const abandonEmail = identified.filter((v) => v.abandonedAt && !v.finished).length
    if (abandonEmail > 0) insights.push(`${abandonEmail} lead(s) com e-mail abandonaram o diagnóstico — recupere com lembrete.`)
    if (hotAnon > 0) insights.push(`${hotAnon} visitante(s) engajado(s) ainda sem e-mail — oportunidade de captura.`)

    return {
      identified,
      hot: list.filter((v) => v.temp === 'quente').length,
      warm: list.filter((v) => v.temp === 'morno').length,
      cold: list.filter((v) => v.temp === 'frio').length,
      insights,
    }
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
                  {stats.diagStart > 0 &&
                    ` (${Math.min(100, Math.round((stats.diagResult / stats.diagStart) * 100))}%)`}
                </span>
              </div>
            </div>
            <div className="card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                E-mails capturados
              </div>
              <div className="mt-1 font-display text-2xl font-semibold text-se-violet">
                {fmtInt(emailCaptures.length)}
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

          {/* ─── INTELIGÊNCIA DE LEADS ─── */}
          <div className="card mt-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                  <Flame className="h-4 w-4 text-se-violet" /> Leads inteligentes
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Score de intenção (0–100) por visitante: engajamento, retorno, diagnóstico,
                  e-mail e clique no pagamento, com decaimento por inatividade.
                </p>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">🔥 {leadIntel.hot} quentes</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-600">{leadIntel.warm} mornos</span>
                <span className="rounded-full bg-se-mist px-3 py-1 text-ink-muted">{leadIntel.cold} frios</span>
              </div>
            </div>

            {leadIntel.insights.length > 0 && (
              <div className="grid gap-2 border-b border-ink/5 bg-se-lavender/20 px-5 py-4 sm:grid-cols-2">
                {leadIntel.insights.map((txt) => (
                  <div key={txt} className="flex items-start gap-2 text-xs text-ink-soft">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-se-violet" />
                    {txt}
                  </div>
                ))}
              </div>
            )}

            {leadIntel.identified.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-ink-muted">
                Nenhum lead identificado por e-mail no período.
              </div>
            ) : (
              <div className="max-h-[460px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                      <th className="px-5 py-3 font-semibold">Lead</th>
                      <th className="px-3 py-3 font-semibold">Score</th>
                      <th className="px-3 py-3 font-semibold">Origem</th>
                      <th className="px-3 py-3 font-semibold">Jornada</th>
                      <th className="px-5 py-3 font-semibold">Próxima ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadIntel.identified.map((v) => (
                      <tr key={v.visitor} className="border-b border-ink/5 last:border-b-0">
                        <td className="px-5 py-3">
                          <a href={`mailto:${v.email}`} className="font-medium text-ink hover:text-se-violet">
                            {v.email}
                          </a>
                          <div className="text-[11px] text-ink-muted">última atividade {fmtDateTime(v.last)}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              v.temp === 'quente'
                                ? 'bg-red-50 text-red-600'
                                : v.temp === 'morno'
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-se-mist text-ink-muted'
                            }`}
                          >
                            {v.score}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-soft">
                          {v.channel}
                          {v.ref ? ` · ${v.ref}` : ''}
                          {v.device ? <div className="text-[11px] text-ink-muted">{v.device}</div> : null}
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-soft">
                          {v.sessions} visita(s) · {v.pages} pág. · {fmtDuration(v.timeMs)}
                          <div className="text-[11px] text-ink-muted">
                            {v.payment ? 'clicou pagamento' : v.finished ? `diagnóstico: ${v.recommendation ?? 'concluído'}` : v.started ? `diagnóstico ${v.answers}/5` : 'não iniciou diagnóstico'}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs font-medium text-se-violet">{v.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ─── FUNIL DE CONVERSÃO ─── */}
          <div className="card mt-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  Funil de conversão
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Acompanhamento inteligente e simplificado da jornada até o pagamento.
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
                {/* Resumo em chips */}
                <div className="mb-6 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-ink/5 bg-se-mist/60 px-3 py-1.5 text-ink-muted">
                    Conversão{' '}
                    <b className="ml-1 font-display text-sm text-se-violet">
                      {funnel[funnel.length - 1].conversion}%
                    </b>
                  </span>
                  {worstRateKey && (() => {
                    const gi = funnel.findIndex((s) => s.key === worstRateKey)
                    if (gi <= 0) return null
                    return (
                      <span className="rounded-full border border-ink/5 bg-se-mist/60 px-3 py-1.5 text-ink-muted">
                        Gargalo{' '}
                        <b className="ml-1 font-display text-sm text-red-600">{funnel[gi].stepConv}%</b>
                        <span className="ml-1 hidden sm:inline">({funnel[gi].label})</span>
                      </span>
                    )
                  })()}
                  <span className="rounded-full border border-ink/5 bg-se-mist/60 px-3 py-1.5 text-ink-muted">
                    Até o pagamento{' '}
                    <b className="ml-1 font-display text-sm text-ink">
                      {fmtSpan(funnel[funnel.length - 1].medianMs)}
                    </b>
                  </span>
                  {emailPct !== null && (
                    <span className="rounded-full border border-ink/5 bg-se-mist/60 px-3 py-1.5 text-ink-muted">
                      E-mails{' '}
                      <b className="ml-1 font-display text-sm text-se-teal">
                        {fmtInt(emailCaptured)} ({emailPct}%)
                      </b>
                    </span>
                  )}
                </div>

                {/* Leitura inteligente */}
                {funnelReads.length > 0 && (
                  <div className="mb-6 grid gap-2 sm:grid-cols-2">
                    {funnelReads.map((txt) => (
                      <div
                        key={txt}
                        className="flex items-start gap-2 rounded-xl bg-se-lavender/30 px-3 py-2 text-xs text-ink-soft"
                      >
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-se-violet" />
                        <span>{txt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Funil responsivo: barras horizontais */}
                <div className="flex flex-col gap-4">
                  {funnel.map((s, i) => {
                    const last = i === funnel.length - 1
                    const worst = s.key === worstDropKey || s.key === worstRateKey
                    const w = Math.max(s.conversion, 1)
                    return (
                      <div key={s.key} className="relative">
                        <div className="flex items-end justify-between mb-1.5">
                          <div className="text-sm font-semibold text-ink">{s.label}</div>
                          <div className="text-right">
                            <span className="font-display text-base font-bold text-ink">{fmtInt(s.count)}</span>
                            <span className="ml-2 text-xs font-medium text-ink-muted">{s.conversion}%</span>
                          </div>
                        </div>
                        <div className="h-3 w-full rounded-full bg-se-mist/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              last ? 'bg-gradient-to-r from-se-teal to-se-violet'
                                : worst ? 'bg-red-400' : 'bg-se-violet/70'
                            }`}
                            style={{ width: `${w}%` }}
                          />
                        </div>
                        {i > 0 && s.drop > 0 && (
                          <div className={`mt-1.5 flex items-center justify-between text-[11px] font-medium ${worst ? 'text-red-600' : 'text-ink-muted'}`}>
                            <span>Passaram: {s.stepConv}%</span>
                            <span>−{fmtInt(s.drop)} perdidos ({s.dropRate}%)</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
                % de quem respondeu a pergunta e não avançou. A pergunta com maior desistência
                vira prioridade de revisão.
              </p>
            </div>
            {questionFunnel.answeredTotal === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-ink-muted">
                Nenhuma pergunta respondida no período.
              </div>
            ) : (
              <>
                {(() => {
                  const worst = questionFunnel.rows.reduce<{ pct: number; question: number } | null>(
                    (acc, r) => (r.pct > 0 && (!acc || r.pct > acc.pct) ? { pct: r.pct, question: r.question } : acc),
                    null,
                  )
                  if (!worst) return null
                  return (
                    <div className="flex items-start gap-2 border-b border-ink/5 bg-se-lavender/30 px-5 py-3 text-xs text-ink-soft">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-se-violet" />
                      <span>
                        <b>Pergunta {worst.question}</b> tem a maior desistência ({worst.pct}% de
                        quem respondeu) — revise o enunciado/expectativa dela primeiro.{' '}
                        {questionFunnel.rate < 100 &&
                          `Só ${questionFunnel.rate}% dos iniciados concluem o diagnóstico.`}
                      </span>
                    </div>
                  )
                })()}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                        <th className="px-5 py-3 font-semibold">Pergunta</th>
                        <th className="px-3 py-3 font-semibold">Responderam</th>
                        <th className="px-3 py-3 font-semibold">Desistiram</th>
                        <th className="px-5 py-3 font-semibold">Barra de desistência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // destaca a pergunta com MAIOR desistência
                        const maxDropped = Math.max(...questionFunnel.rows.map((r) => r.dropped), 0)
                        return questionFunnel.rows.map((row) => {
                          const pct = Math.min(100, row.pct)
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
                        <td className="px-3 py-3 text-xs text-ink-muted">
                          Concluíram: {fmtInt(questionFunnel.completed)}
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-muted">
                          Taxa de conclusão: {questionFunnel.rate}%
                        </td>
                        <td className="px-5 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
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
              <>
                <div className="divide-y divide-ink/5">
                  {pagedJourneys.map((j) => (
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
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/5 px-5 py-3 text-xs text-ink-muted">
                  <span>
                    {journeys.length === 0
                      ? '—'
                      : `Mostrando ${(journeySafePage - 1) * JOURNEY_PAGE_SIZE + 1}–${Math.min(
                          journeySafePage * JOURNEY_PAGE_SIZE,
                          journeys.length,
                        )} de ${fmtInt(journeys.length)} sessões`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={journeySafePage <= 1}
                      onClick={() => setJourneyPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-ink/10 bg-white px-3 py-1 text-xs text-ink hover:border-se-violet focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <span className="tabular-nums">
                      {journeySafePage} / {journeyTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={journeySafePage >= journeyTotalPages}
                      onClick={() => setJourneyPage((p) => Math.min(journeyTotalPages, p + 1))}
                      className="rounded-lg border border-ink/10 bg-white px-3 py-1 text-xs text-ink hover:border-se-violet focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  )
}
