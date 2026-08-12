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
