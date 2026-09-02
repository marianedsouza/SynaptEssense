import { supabase } from './supabase'

export interface SessionRecord {
  id: string
  lead_id: string
  date: string
  status: 'agendada' | 'realizada' | 'faltou'
  notes: string | null
  created_at: string
  updated_at: string
}

export async function fetchSessionsByLead(leadId: string): Promise<SessionRecord[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('lead_id', leadId)
    .order('date', { ascending: true })
  if (error) return []
  return (data ?? []) as SessionRecord[]
}

export async function addSession(leadId: string, date: string, notes?: string) {
  return supabase.from('sessions').insert({
    lead_id: leadId,
    date,
    status: 'agendada',
    notes: notes || null,
  })
}

export async function updateSessionStatus(id: string, status: SessionRecord['status']) {
  return supabase.from('sessions').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteSession(id: string) {
  return supabase.from('sessions').delete().eq('id', id)
}
