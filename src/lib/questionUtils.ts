import { brandQuestions, personQuestions } from './questionBank'
import type { Question } from './types'

export const BRAND_MODES = [
  'Para minha marca pessoal',
  'Para uma empresa',
  'Para uma organização',
  'Para outro projeto',
]

export function hasBrandModule(surveyFor: string | null | undefined): boolean {
  return surveyFor ? BRAND_MODES.includes(surveyFor) : false
}

export function buildQuestionList(surveyFor: string | null | undefined): Question[] {
  const person = personQuestions()
  if (!hasBrandModule(surveyFor)) return person
  return [...person, ...brandQuestions()]
}

export function hasAnswer(
  value: string | string[] | undefined | null,
): boolean {
  if (value === undefined || value === null) return false
  if (Array.isArray(value)) return value.length > 0
  return value !== ''
}

export interface ParticipantPosition {
  total: number
  answered: number
  nextNumber: number
  nextQuestion: Question | null
}

export function participantPosition(
  surveyFor: string | null | undefined,
  answers: Record<string, string | string[]> | null | undefined,
): ParticipantPosition {
  const questions = buildQuestionList(surveyFor)
  const answered = questions.filter((q) => hasAnswer(answers?.[q.id])).length
  const firstUnanswered = questions.findIndex((q) => !hasAnswer(answers?.[q.id]))
  return {
    total: questions.length,
    answered,
    nextNumber: firstUnanswered === -1 ? questions.length : firstUnanswered,
    nextQuestion: firstUnanswered === -1 ? null : questions[firstUnanswered],
  }
}
