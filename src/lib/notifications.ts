import { supabase } from './supabase'

export type NotificationType =
  | 'info'
  | 'success'
  | 'session'
  | 'payment'
  | 'reminder'
  | 'diagnostic'

export interface AppNotification {
  id: string
  email: string
  type: NotificationType
  title: string
  message: string
  link_url: string | null
  read_at: string | null
  created_at: string
}

export interface NotificationInput {
  email: string
  type: NotificationType
  title: string
  message?: string
  link_url?: string | null
}

export async function fetchNotifications(email: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return (data as AppNotification[]) ?? []
}

export async function createNotification(
  input: NotificationInput,
): Promise<AppNotification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      email: input.email,
      type: input.type,
      title: input.title,
      message: input.message ?? '',
      link_url: input.link_url ?? null,
    })
    .select('*')
    .single()
  if (error) return null
  return (data as AppNotification) ?? null
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
}

export async function markAllNotificationsRead(email: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('email', email)
    .is('read_at', null)
}

/** Assina a tabela notifications e chama onInsert para cada registro novo do e-mail. */
export function subscribeNotifications(
  email: string,
  onInsert: (n: AppNotification) => void,
): () => void {
  const channel = supabase
    .channel(`notifications-${email}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `email=eq.${email}`,
      },
      (payload) => onInsert(payload.new as AppNotification),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

/** Notificação nativa do navegador (item 9). Retorna false se indisponível. */
export function showNativeNotification(n: AppNotification): boolean {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return false
  }
  try {
    new Notification(n.title, {
      body: n.message,
      tag: `synapt-notif-${n.id}`,
      icon: '/favicon.ico',
    })
    return true
  } catch {
    return false
  }
}

export async function requestNativeNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function nativeNotificationsEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  )
}