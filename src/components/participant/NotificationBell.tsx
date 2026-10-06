import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellRing,
  CalendarDays,
  Check,
  CheckCheck,
  CreditCard,
  Info,
  Sparkles,
} from 'lucide-react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  nativeNotificationsEnabled,
  requestNativeNotifications,
  showNativeNotification,
  subscribeNotifications,
  type AppNotification,
  type NotificationType,
} from '../../lib/notifications'

const TYPE_META: Record<NotificationType, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'bg-se-mist text-ink' },
  success: { icon: Check, className: 'bg-se-teal/10 text-se-teal-dark' },
  session: { icon: CalendarDays, className: 'bg-se-lavender text-se-violet' },
  payment: { icon: CreditCard, className: 'bg-se-lavender text-se-violet' },
  reminder: { icon: BellRing, className: 'bg-amber-50 text-amber-600' },
  diagnostic: { icon: Sparkles, className: 'bg-se-violet/10 text-se-violet' },
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 7) return `${days} dias`
  return new Date(iso).toLocaleDateString('pt-BR')
}

interface NotificationBellProps {
  email: string
}

/** Central de notificações (item 10) + notificação nativa (item 9). */
export function NotificationBell({ email }: NotificationBellProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [nativeEnabled, setNativeEnabled] = useState(nativeNotificationsEnabled())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchNotifications(email)
      .then((list) => {
        if (!cancelled) setNotifications(list)
      })
      .catch(() => {
        if (!cancelled) setNotifications([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [email])

  useEffect(() => {
    const unsubscribe = subscribeNotifications(email, (n) => {
      setNotifications((prev) => [n, ...prev].slice(0, 50))
      showNativeNotification(n)
    })
    return unsubscribe
  }, [email])

  // Fecha ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = notifications.filter((n) => !n.read_at).length

  async function handleOpenRow(n: AppNotification) {
    if (!n.read_at) {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)),
      )
      await markNotificationRead(n.id)
    }
    if (n.link_url) navigate(n.link_url)
    setOpen(false)
  }

  async function handleMarkAll() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })))
    await markAllNotificationsRead(email)
  }

  async function handleToggleNative() {
    if (nativeEnabled) return
    const granted = await requestNativeNotifications()
    setNativeEnabled(granted)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative rounded-full border p-2.5 backdrop-blur transition ${
          open
            ? 'border-se-violet/30 bg-se-lavender text-se-violet'
            : 'border-ink/10 bg-white/70 text-ink-soft hover:text-ink'
        }`}
        aria-label="Central de notificações"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-se-violet px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 animate-fade-up overflow-hidden rounded-2xl border border-ink/5 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-ink/5 px-4 py-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                Central de notificações
              </div>
              <div className="text-xs text-ink-muted">
                {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
              </div>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 rounded-full bg-se-mist px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:text-ink"
              >
                <CheckCheck className="h-3 w-3" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="space-y-3 px-4 py-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-se-mist/60" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-se-mist">
                  <BellRing className="h-4 w-4 text-ink-muted" />
                </div>
                <p className="mt-3 text-sm text-ink-muted">
                  Nenhuma notificação por enquanto.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] ?? TYPE_META.info
                const Icon = meta.icon
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleOpenRow(n)}
                    className={`flex w-full items-start gap-3 border-b border-ink/5 px-4 py-3 text-left transition hover:bg-se-mist/40 ${
                      !n.read_at ? 'bg-se-lavender/20' : ''
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.className}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">
                        {n.title}
                        {!n.read_at && (
                          <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-se-violet" />
                        )}
                      </span>
                      {n.message && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                          {n.message}
                        </span>
                      )}
                      <span className="mt-1 block text-[10px] text-ink-muted">
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-ink/5 px-4 py-2.5">
            <div className="text-[11px] text-ink-muted">
              {nativeEnabled ? 'Notificações do navegador ativas' : 'Notificações do navegador'}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={nativeEnabled}
              onClick={handleToggleNative}
              disabled={nativeEnabled}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                nativeEnabled ? 'bg-se-teal' : 'bg-ink/20'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  nativeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}