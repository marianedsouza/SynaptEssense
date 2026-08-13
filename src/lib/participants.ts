import { supabase } from './supabase'
import { QUESTIONNAIRE_VERSION } from './questionBank'
import type {
  IdentificationData,
  Participant,
  ParticipantAnswers,
  SurveyFor,
} from './types'

export const SESSION_KEY = 'synaptessence_participant_id'

export const getSessionId = (): string | null =>
  localStorage.getItem(SESSION_KEY)

export const setSessionId = (id: string): void => {
  localStorage.setItem(SESSION_KEY, id)
}

export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY)
}

export async function createParticipant(
  identification: IdentificationData,
  consent: boolean,
): Promise<Participant> {
  const now = new Date().toISOString()
  const payload = {
    name: identification.fullName || null,
    email: identification.email || null,
    city: identification.city || null,
    state: identification.state || null,
    birth_date: identification.birthDate || null,
    age: identification.age || null,
    field: identification.field || null,
    experience_time: identification.experienceTime || null,
    organization: identification.organization || null,
    survey_for: (identification.surveyFor || null) as SurveyFor | null,
    answers: {},
    questionnaire_version: QUESTIONNAIRE_VERSION,
    identification,
    started_at: now,
    consent,
  }
  const { data, error } = await supabase.rpc('create_participant', {
    payload,
  })

  if (error) throw new Error(error.message)
  return data as unknown as Participant
}

export async function fetchParticipant(
  id: string,
): Promise<Participant | null> {
  const { data, error } = await supabase.rpc('get_participant', { p_id: id })
  if (error) return null
  return data as unknown as Participant | null
}

export async function getParticipantByEmail(
  email: string,
): Promise<Participant | null> {
  const { data, error } = await supabase.rpc('get_participant_by_email', {
    p_email: email,
  })
  if (error) return null
  return data as unknown as Participant | null
}

export async function saveAnswers(
  id: string,
  answers: ParticipantAnswers,
  progress: number,
): Promise<void> {
  await supabase.rpc('save_participant_answers', {
    p_id: id,
    p_answers: answers,
    p_progress: progress,
  })
}

export async function completeParticipant(
  id: string,
  answers: ParticipantAnswers,
  progress: number,
  completedTimeSeconds: number,
): Promise<void> {
  await supabase.rpc('complete_participant', {
    p_id: id,
    p_answers: answers,
    p_progress: progress,
    p_time_seconds: completedTimeSeconds,
  })
}
