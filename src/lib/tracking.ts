// ─── Tracking de comportamento do visitante ─────────────────────────────────
// Registra eventos anônimos (páginas, rolagem, diagnóstico, e-mails, cliques
// de pagamento) na tabela `tracking_events` (supabase/add_tracking.sql).
// Nada é bloqueante: falhas de rede são engolidas para não afetar a UX.

const VISITOR_KEY = 'synapt_visitor_id'
const SESSION_KEY = 'synapt_session_id'
const REF_KEY = 'synapt_ref'
const QUEUE_KEY = 'synapt_track_queue'

export type TrackEventType =
  | 'page_view'
  | 'page_leave'
  | 'diagnostic_start'
  | 'diagnostic_answer'
  | 'diagnostic_abandon'
  | 'diagnostic_result'
  | 'diagnostic_skip_email'
  | 'email_capture'
  | 'payment_click'

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
  if (path.startsWith('/admin')) return

  const row: QueuedEvent = {
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    ref: currentRef(),
    path,
    event,
    detail: opts?.detail,
    scroll_depth: opts?.scrollDepth,
    time_on_page_ms: opts?.timeOnPageMs,
    created_at: new Date().toISOString(),
  }

  const q = getQueue()
  q.push(row)
  if (q.length > 40) {
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

function attachScrollTracking(): void {
  if (scrollListener) window.removeEventListener('scroll', scrollListener)
  const onScroll = () => {
    const depth = computeScrollDepth()
    if (depth > maxScrollDepth) maxScrollDepth = depth
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
  // Fecha a página anterior mesmo ao entrar em /admin (senão o page_leave fica preso).
  if (target.startsWith('/admin')) return
  currentPath = target
  pageStartedAt = Date.now()
  maxScrollDepth = 0
  track('page_view', { path: target })
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
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      onHide()
    } else {
      resumeCurrentPage()
    }
  })
}
