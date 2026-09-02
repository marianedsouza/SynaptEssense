export const PROTOCOL_TOTAL_SESSIONS = 12
export const PROTOCOL_TOTAL_DAYS = 90

export const PLAN_MONTHS: Record<'mensal' | 'completo', number> = {
  mensal: 1,
  completo: 3,
}

export const MODALITY_LABELS: Record<'social' | 'integral', string> = {
  social: 'Modalidade Social',
  integral: 'Protocolo Integral de Reconstrução',
}

export function planDurationMonths(plan: 'mensal' | 'completo') {
  return PLAN_MONTHS[plan]
}

export function planQualityLabel(plan: 'mensal' | 'completo') {
  return plan === 'mensal' ? 'Plano mensal' : 'Plano completo'
}
