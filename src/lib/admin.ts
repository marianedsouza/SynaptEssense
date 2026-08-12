import { supabase } from './supabase'
import type { AnalystNote, Participant } from './types'

export async function fetchParticipants(): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Participant[]
}

export async function fetchParticipantById(id: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Participant
}

const EMPTY_NOTE = {
  impressions: '',
  observations: '',
  deepening: '',
  potentials: '',
  attention_points: '',
  next_steps: '',
}

export async function fetchAnalystNote(
  participantId: string,
): Promise<AnalystNote> {
  const { data, error } = await supabase
    .from('analyst_notes')
    .select('*')
    .eq('participant_id', participantId)
    .maybeSingle()
  if (error || !data) {
    return { ...EMPTY_NOTE, participant_id: participantId, id: '', updated_at: '' }
  }
  return data as AnalystNote
}

export async function upsertAnalystNote(
  participantId: string,
  fields: Partial<Omit<AnalystNote, 'id' | 'participant_id' | 'updated_at'>>,
): Promise<boolean> {
  const { error } = await supabase
    .from('analyst_notes')
    .upsert(
      {
        participant_id: participantId,
        ...fields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'participant_id' },
    )
  return !error
}
