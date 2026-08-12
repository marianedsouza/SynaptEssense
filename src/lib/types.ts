export type QuestionType = 'likert' | 'open' | 'single' | 'multiple' | 'text'

export interface QuestionOption {
  id: string
  label: string
}

export interface Question {
  id: string
  version: string
  axis: string
  order: number
  type: QuestionType
  text: string
  options: QuestionOption[]
  required: boolean
  module: 'person' | 'brand'
  archetype?: string
}

export type SurveyFor =
  | 'Para mim'
  | 'Para minha atuação profissional'
  | 'Para minha marca pessoal'
  | 'Para uma empresa'
  | 'Para uma organização'
  | 'Para outro projeto'

export interface IdentificationData {
  fullName: string
  email: string
  city: string
  state: string
  birthDate: string
  age: string
  field: string
  experienceTime: string
  organization: string
  surveyFor: SurveyFor | ''
}

export interface ParticipantAnswers {
  [questionId: string]: string | string[]
}

export type ParticipantStatus =
  | 'iniciado'
  | 'em_andamento'
  | 'concluido'

export interface Participant {
  id: string
  created_at: string
  name: string | null
  email: string | null
  city: string | null
  state: string | null
  birth_date: string | null
  age: number | null
  field: string | null
  experience_time: string | null
  organization: string | null
  survey_for: SurveyFor | null
  status: ParticipantStatus
  progress: number
  answers: ParticipantAnswers
  questionnaire_version: string
  identification: IdentificationData | null
  started_at: string | null
  completed_at: string | null
  consent: boolean
  completed_time_seconds: number | null
}

export interface AnalystNote {
  id: string
  participant_id: string
  impressions: string
  observations: string
  deepening: string
  potentials: string
  attention_points: string
  next_steps: string
  updated_at: string
}

export interface SiteSetting {
  key: string
  value: string
}

export interface AnalystProfile {
  name: string
  title: string
  photoUrl: string
  bio: string
}
