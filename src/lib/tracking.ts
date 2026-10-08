// ─── Tracking de comportamento do visitante ─────────────────────────────────
// Registra eventos anônimos (páginas, rolagem, diagnóstico, e-mails, cliques
// de pagamento) na tabela `tracking_events` (supabase/add_tracking.sql).
// Nada é bloqueante: falhas de rede são engolidas para não afetar a UX.

const VISITOR_KEY = 'synapt_visitor_id'
const SESSION_KEY = 'synapt_session_id'
const REF_KEY = 'synapt_ref'
const QUEUE_KEY = 'synapt_track_queue'
const IDENTITY_KEY = 'synapt_identity' // e-mail conhecido do visitante (identity stitching)
const ATTR_KEY = 'synapt_attribution' // first-touch completo (UTMs, referrer, landing)
const VISITS_KEY = 'synapt_visit_count'
const PREVIEW_KEY = 'synapt_preview' // marca os eventos gerados pelo admin em /admin/preview?email=

/** Eventos de alto valor: enviados imediatamente (não esperam o lote de 4s). */
const CRITICAL_EVENTS = new Set<string>([
  'email_capture',
  'diagnostic_result',
  'payment_click',
  'diagnostic_abandon',
])

export type TrackEventType =
  | 'page_view'
  | 'page_leave'
  | 'diagnostic_start'
  | 'diagnostic_answer'
  | 'diagnostic_abandon'
  | 'diagnostic_result'
  | 'diagnostic_skip_email'
  | 'diagnostic_resume'
  | 'email_capture'
  | 'payment_click'
  | 'diag_reminder_sent'
  | 'scroll_milestone'
  | 'cta_click'
  | 'identify'

interface QueuedEvent {
  visitor_id: string
  session_id: string | null
  ref: string | null
  path: string
  event: TrackEventType
  detail?: Record<string, unknown>
  scroll_depth?: number
  time_on_page_ms?: number
  created_at: string
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // sessão encerra após 30min de inatividade

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {
    // fallback abaixo
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function safeGet(key: string, store: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null): string | null {
  try {
    return store?.getItem(key) ?? null
  } catch {
    return null
  }
}

function safeSet(key: string, value: string, store: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null): void {
  try {
    store?.setItem(key, value)
  } catch {
    // armazenamento indisponível (modo privado etc.)
  }
}

export function getVisitorId(): string {
  let id = safeGet(VISITOR_KEY)
  if (!id) {
    id = randomId()
    safeSet(VISITOR_KEY, id)
  }
  return id
}

function getSessionId(): string {
  let raw = safeGet(SESSION_KEY, typeof sessionStorage !== 'undefined' ? sessionStorage : null)
  let sessionId: string
  let lastTouch = 0
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { id: string; t: number }
      sessionId = parsed.id
      lastTouch = parsed.t
    } catch {
      sessionId = randomId()
    }
  } else {
    sessionId = randomId()
  }
  if (Date.now() - lastTouch > SESSION_TIMEOUT_MS) {
    sessionId = randomId()
  }
  safeSet(SESSION_KEY, JSON.stringify({ id: sessionId, t: Date.now() }), typeof sessionStorage !== 'undefined' ? sessionStorage : null)
  return sessionId
}

/** Captura ?ref= / ?utm_source= da URL (first-touch, persiste). */
export function captureRef(search?: string): string | null {
  const stored = safeGet(REF_KEY)
  if (stored) return stored
  try {
    const params = new URLSearchParams(search ?? (typeof window !== 'undefined' ? window.location.search : ''))
    const ref = params.get('ref') || params.get('utm_source') || null
    if (ref) safeSet(REF_KEY, ref)
    return ref
  } catch {
    return null
  }
}

function currentRef(): string | null {
  return captureRef()
}

// ─── Modo preview do admin (testes da analista) ────────────────────────────
// A rota /admin/preview permite à analista navegar como o paciente. Eventos
// gerados aí são marcados com `preview: true` para não distorcer os números
// reais do painel, e a marca se propaga para as páginas públicas visitadas
// em sequência (protocolo, pagamento etc.) na mesma sessão.

function isPreviewPath(path: string): boolean {
  return path.startsWith('/admin/preview')
}

function storedPreview(): boolean {
  return safeGet(PREVIEW_KEY, typeof sessionStorage !== 'undefined' ? sessionStorage : null) === '1'
}

let previewSession = storedPreview()

function currentPreview(): boolean {
  return previewSession
}

function setPreview(on: boolean): void {
  previewSession = on
  safeSet(PREVIEW_KEY, on ? '1' : '', typeof sessionStorage !== 'undefined' ? sessionStorage : null)
}

// ─── Atribuição inteligente (first-touch) ───────────────────────────────────

export interface Attribution {
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
  referrer: string | null
  channel: string
  landing: string
  device: 'mobile' | 'tablet' | 'desktop'
  first_seen: string
}

function detectDevice(): Attribution['device'] {
  try {
    const ua = navigator.userAgent
    if (/iPad|Tablet/i.test(ua)) return 'tablet'
    if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile'
  } catch {
    // ignora
  }
  return 'desktop'
}

/** Classifica o canal de aquisição a partir de UTMs + referrer. */
function classifyChannel(source: string | null, medium: string | null, referrer: string | null): string {
  const s = (source || '').toLowerCase()
  const m = (medium || '').toLowerCase()
  const r = (referrer || '').toLowerCase()
  if (/cpc|ppc|paid|ads/.test(m)) return 'Pago'
  if (/email|newsletter/.test(m) || /email|newsletter/.test(s)) return 'E-mail'
  if (/whats|wa\.me/.test(s + r)) return 'WhatsApp'
  if (/insta|facebook|fb|tiktok|linkedin|youtube|twitter|t\.co|threads|pinterest/.test(s + r)) return 'Social'
  if (/google|bing|yahoo|duckduckgo|ecosia/.test(r)) return 'Busca orgânica'
  if (s) return 'Link compartilhado'
  if (r) return 'Indicação (site)'
  return 'Direto'
}

export function getAttribution(): Attribution {
  const stored = safeGet(ATTR_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as Attribution
    } catch {
      // recalcula
    }
  }
  let params: URLSearchParams
  try {
    params = new URLSearchParams(window.location.search)
  } catch {
    params = new URLSearchParams()
  }
  let referrer: string | null = null
  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname
      if (host && host !== window.location.hostname) referrer = host
    }
  } catch {
    referrer = null
  }
  const source = params.get('utm_source') || params.get('ref') || null
  const medium = params.get('utm_medium')
  const attr: Attribution = {
    source,
    medium,
    campaign: params.get('utm_campaign'),
    content: params.get('utm_content'),
    term: params.get('utm_term'),
    referrer,
    channel: classifyChannel(source, medium, referrer),
    landing: window.location.pathname,
    device: detectDevice(),
    first_seen: new Date().toISOString(),
  }
  safeSet(ATTR_KEY, JSON.stringify(attr))
  return attr
}

// ─── Identidade (liga visitante anônimo ao e-mail) ──────────────────────────

export function getIdentity(): string | null {
  return safeGet(IDENTITY_KEY)
}

/** Associa o visitante a um e-mail. Eventos seguintes carregam o e-mail. */
export function identify(email: string, traits?: Record<string, unknown>): void {
  const clean = email.trim().toLowerCase()
  if (!clean) return
  const already = getIdentity() === clean
  safeSet(IDENTITY_KEY, clean)
  if (!already) track('identify', { detail: { email: clean, ...traits } })
}

function bumpVisitCount(): number {
  const n = Number(safeGet(VISITS_KEY) || '0') + 1
  safeSet(VISITS_KEY, String(n))
  return n
}

function readQueue(): QueuedEvent[] {
  const raw = safeGet(QUEUE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

let queue: QueuedEvent[] | null = null
function getQueue(): QueuedEvent[] {
  if (!queue) queue = readQueue()
  if (queue.length > 200) queue = queue.slice(queue.length - 200)
  return queue
}

function persistQueue(): void {
  try {
    safeSet(QUEUE_KEY, JSON.stringify(getQueue()))
  } catch {
    // fila grande demais — descarta para não travar o storage
    safeSet(QUEUE_KEY, '[]')
  }
}

let sending = false
async function flushQueue(keepalive = false): Promise<void> {
  const q = getQueue()
  if (q.length === 0 || sending) return
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || !anonKey || supabaseUrl.includes('placeholder')) return

  sending = true
  const batch = q.splice(0, keepalive ? 40 : q.length)
  persistQueue()
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/tracking_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(batch),
      keepalive,
    })
    if (!res.ok && !keepalive) {
      // devolve os eventos para a fila (evita perder dados em falha transitória)
      queue = [...batch, ...getQueue()]
      persistQueue()
    }
  } catch {
    if (!keepalive) {
      queue = [...batch, ...getQueue()]
      persistQueue()
    }
  } finally {
    sending = false
    // eventos que chegaram durante o envio (ex.: e-mail capturado) não ficam presos
    if (!keepalive && getQueue().length > 0) scheduleFlush()
  }
}

let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushQueue()
  }, 4000)
}

export function track(
  event: TrackEventType,
  opts?: {
    path?: string
    detail?: Record<string, unknown>
    scrollDepth?: number
    timeOnPageMs?: number
  },
): void {
  if (typeof window === 'undefined') return
  const path = opts?.path ?? window.location.pathname
  const preview = isPreviewPath(path) || currentPreview()
  if (!preview && path.startsWith('/admin')) return
  if (preview) setPreview(true)

  const identity = getIdentity()
  const detail: Record<string, unknown> | undefined =
    identity || opts?.detail || preview
      ? { ...(identity ? { email: identity } : {}), ...(opts?.detail ?? {}), ...(preview ? { preview: true } : {}) }
      : undefined

  const row: QueuedEvent = {
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    ref: currentRef(),
    path,
    event,
    detail,
    scroll_depth: opts?.scrollDepth,
    time_on_page_ms: opts?.timeOnPageMs,
    created_at: new Date().toISOString(),
  }

  const q = getQueue()
  q.push(row)
  if (q.length > 40 || CRITICAL_EVENTS.has(event)) {
    persistQueue()
    void flushQueue()
  } else {
    persistQueue()
    scheduleFlush()
  }
}

// ─── Página atual: tempo + profundidade de rolagem ──────────────────────────

let currentPath: string | null = null
let pageStartedAt = 0
let maxScrollDepth = 0
let scrollListener: (() => void) | null = null

function computeScrollDepth(): number {
  try {
    const doc = document.documentElement
    const scrollTop = window.scrollY || doc.scrollTop || 0
    const total = doc.scrollHeight - window.innerHeight
    if (total <= 0) return 100
    return Math.min(100, Math.max(0, Math.round(((scrollTop + window.innerHeight) / doc.scrollHeight) * 100)))
  } catch {
    return 0
  }
}

let milestonesHit = new Set<number>()

function attachScrollTracking(): void {
  if (scrollListener) window.removeEventListener('scroll', scrollListener)
  milestonesHit = new Set<number>()
  const onScroll = () => {
    const depth = computeScrollDepth()
    if (depth > maxScrollDepth) maxScrollDepth = depth
    // Marcos de leitura (50/90%) — sinal forte de interesse na página
    for (const m of [50, 90]) {
      if (depth >= m && !milestonesHit.has(m) && currentPath) {
        milestonesHit.add(m)
        // ignora páginas curtas que já carregam "100%"
        if (Date.now() - pageStartedAt > 1500) {
          track('scroll_milestone', { path: currentPath, scrollDepth: m })
        }
      }
    }
  }
  scrollListener = onScroll
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

function leaveCurrentPage(): void {
  if (!currentPath) return
  const timeOnPageMs = pageStartedAt ? Date.now() - pageStartedAt : undefined
  track('page_leave', {
    path: currentPath,
    scrollDepth: maxScrollDepth,
    timeOnPageMs,
  })
  currentPath = null
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener)
    scrollListener = null
  }
}

/** Registra entrada na página e inicia medição de tempo/rolagem. */
export function enterPage(path?: string): void {
  const target = path ?? window.location.pathname
  // Evita page_view duplicado quando o efeito roda 2x (React StrictMode em dev).
  if (target === currentPath) return
  leaveCurrentPage()
  // Fecha a página anterior mesmo ao entrar em qualquer /admin (senão o
  // page_leave fica preso). Rotas /admin fora do preview não geram tracking.
  if (target.startsWith('/admin') && !isPreviewPath(target)) {
    setPreview(false)
    return
  }
  currentPath = target
  pageStartedAt = Date.now()
  maxScrollDepth = 0
  // Primeira página da sessão carrega a atribuição completa + nº da visita
  const isNewSession = !sessionSeen
  sessionSeen = true
  if (isNewSession) {
    const attr = getAttribution()
    track('page_view', {
      path: target,
      detail: { ...attr, visit_number: bumpVisitCount(), session_start: true },
    })
  } else {
    track('page_view', { path: target })
  }
  attachScrollTracking()
  scheduleFlush()
}

/** Retoma medição de tempo/rolagem quando a aba volta a ficar visível.
 * Não emite page_view novo (o visitante continua na mesma página). */
function resumeCurrentPage(): void {
  const target = typeof window !== 'undefined' ? window.location.pathname : ''
  if (currentPath || target.startsWith('/admin') || !target) return
  currentPath = target
  pageStartedAt = Date.now()
  attachScrollTracking()
}

let installed = false
let sessionSeen = false

/** Instala flush automático ao sair da página (uma única vez). */
export function initTracking(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  captureRef()
  const onHide = () => {
    leaveCurrentPage()
    void flushQueue(true)
  }
  window.addEventListener('pagehide', onHide)
  // Reenvia eventos que ficaram na fila (offline / aba fechada) assim que possível
  window.addEventListener('online', () => void flushQueue())
  setTimeout(() => void flushQueue(), 1500)
  // Cliques em CTAs: qualquer elemento com data-track="nome" é registrado
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-track]') as HTMLElement | null
      if (el) track('cta_click', { detail: { cta: el.dataset.track } })
    },
    { capture: true },
  )
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      onHide()
    } else {
      resumeCurrentPage()
    }
  })
}
