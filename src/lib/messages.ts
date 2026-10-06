import { supabase } from './supabase'

export type MessageSender = 'analyst' | 'participant'

export interface Message {
  id: string
  email: string
  sender: MessageSender
  body: string
  read_at: string | null
  created_at: string
}

export async function fetchMessages(email: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) throw new Error(error.message)
  return (data as Message[]) ?? []
}

export async function sendMessage(
  email: string,
  sender: MessageSender,
  body: string,
): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ email, sender, body })
    .select('*')
    .single()
  if (error) return null
  return (data as Message) ?? null
}

/** Marca como lidas as mensagens do outro lado do thread. */
export async function markThreadRead(email: string, sender: MessageSender): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('email', email)
    .eq('sender', sender)
    .is('read_at', null)
}

export function subscribeMessages(
  email: string,
  onInsert: (m: Message) => void,
): () => void {
  const channel = supabase
    .channel(`messages-${email}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `email=eq.${email}`,
      },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}