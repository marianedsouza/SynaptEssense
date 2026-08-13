import { hasAnswer } from './questionUtils'
import { LIKERT_SCALE } from './questionBank'
import { AXIS } from './axes'
import type { Participant, Question } from './types'

export type ArchetypeId =
  | 'rebel'
  | 'sage'
  | 'innocent'
  | 'explorer'
  | 'creator'
  | 'ruler'
  | 'caregiver'
  | 'magician'
  | 'jester'
  | 'lover'
  | 'warrior'
  | 'orphan'

export interface ArchetypeMeta {
  id: ArchetypeId
  label: string
  essence: string[]
  badge: string
  bar: string
}

export const ARCHETYPE_META: Record<ArchetypeId, ArchetypeMeta> = {
  rebel: {
    id: 'rebel',
    label: 'Rebelde',
    essence: ['Quebra de padrões', 'Revolução', 'Questionamento'],
    badge: 'bg-rose-50 text-rose-700',
    bar: 'bg-rose-400',
  },
  sage: {
    id: 'sage',
    label: 'Sábia',
    essence: ['Conhecimento', 'Método', 'Consciência'],
    badge: 'bg-amber-50 text-amber-700',
    bar: 'bg-amber-400',
  },
  innocent: {
    id: 'innocent',
    label: 'Inocente',
    essence: ['Simplicidade', 'Esperança', 'Pureza'],
    badge: 'bg-sky-50 text-sky-700',
    bar: 'bg-sky-400',
  },
  explorer: {
    id: 'explorer',
    label: 'Exploradora',
    essence: ['Liberdade', 'Individualidade', 'Independência'],
    badge: 'bg-cyan-50 text-cyan-700',
    bar: 'bg-cyan-400',
  },
  creator: {
    id: 'creator',
    label: 'Criadora',
    essence: ['Criatividade', 'Inovação', 'Curiosidade'],
    badge: 'bg-fuchsia-50 text-fuchsia-700',
    bar: 'bg-fuchsia-400',
  },
  ruler: {
    id: 'ruler',
    label: 'Governante',
    essence: ['Liderança', 'Poder', 'Sucesso'],
    badge: 'bg-indigo-50 text-indigo-700',
    bar: 'bg-indigo-400',
  },
  caregiver: {
    id: 'caregiver',
    label: 'Cuidadora',
    essence: ['Acolhimento', 'Empatia', 'Proteção'],
    badge: 'bg-emerald-50 text-emerald-700',
    bar: 'bg-emerald-400',
  },
  magician: {
    id: 'magician',
    label: 'Mago',
    essence: ['Transformação', 'Consciência', 'Propósito'],
    badge: 'bg-violet-50 text-violet-700',
    bar: 'bg-violet-400',
  },
  jester: {
    id: 'jester',
    label: 'Bobo',
    essence: ['Leveza', 'Humor', 'Espontaneidade'],
    badge: 'bg-yellow-50 text-yellow-700',
    bar: 'bg-yellow-400',
  },
  lover: {
    id: 'lover',
    label: 'Amante',
    essence: ['Conexão', 'Beleza', 'Encantamento'],
    badge: 'bg-pink-50 text-pink-700',
    bar: 'bg-pink-400',
  },
  warrior: {
    id: 'warrior',
    label: 'Guerreira',
    essence: ['Coragem', 'Força', 'Disciplina'],
    badge: 'bg-orange-50 text-orange-700',
    bar: 'bg-orange-400',
  },
  orphan: {
    id: 'orphan',
    label: 'Órfã',
    essence: ['Pertencimento', 'Acolhimento', 'Superação da desilusão'],
    badge: 'bg-slate-100 text-slate-700',
    bar: 'bg-slate-400',
  },
}

export const ARCHETYPE_IDS = Object.keys(ARCHETYPE_META) as ArchetypeId[]

export const PERSON_AXES = [
  'identity',
  'relationships',
  'leadership',
  'purpose',
  'career',
  'communication',
  'challenges',
  'potential',
  'development',
]

export const POTENCIA_AXES = ['potential']
export const EVOLUCAO_AXES = ['purpose', 'development']

type Weights = Partial<Record<ArchetypeId, number>>

const q = (id: string, weights: Weights): [string, Weights] => [id, weights]

const WEIGHT_MAP: Record<string, Weights> = Object.fromEntries([
  // ── IDENTIDADE ──
  q('id_01', { rebel: 3, warrior: 1 }),
  q('id_02', { sage: 3, ruler: 1 }),
  q('id_03', { innocent: 2, sage: 2 }),
  q('id_04', { explorer: 3, jester: 1 }),
  q('id_05', { creator: 3, explorer: 1 }),
  q('id_06', { ruler: 3, warrior: 2 }),
  q('id_07', { caregiver: 3, lover: 1 }),
  q('id_08', { magician: 3, explorer: 2 }),
  q('id_09', { jester: 3, innocent: 1 }),
  q('id_10', { lover: 3, caregiver: 1 }),
  // ── RELACIONAMENTOS ──
  q('rl_01', { lover: 3, explorer: 1 }),
  q('rl_02', { caregiver: 3, lover: 1 }),
  q('rl_03', { orphan: 3, lover: 1 }),
  q('rl_04', { orphan: 3, caregiver: 1 }),
  q('rl_05', { lover: 3, jester: 1 }),
  q('rl_06', { warrior: 3, ruler: 2 }),
  q('rl_07', { caregiver: 3, ruler: 1 }),
  q('rl_08', { explorer: 3, sage: 1 }),
  q('rl_09', { sage: 3, lover: 2 }),
  // ── LIDERANÇA E AUTONOMIA ──
  q('ld_01', { ruler: 3, warrior: 2 }),
  q('ld_02', { warrior: 3, ruler: 2, rebel: 1 }),
  q('ld_03', { warrior: 3, ruler: 1 }),
  q('ld_04', { ruler: 3, magician: 1, caregiver: 1 }),
  q('ld_05', { ruler: 3, warrior: 1 }),
  q('ld_06', { warrior: 3, ruler: 1 }),
  q('ld_07', { explorer: 3, sage: 1 }),
  q('ld_08', { ruler: 3 }),
  q('ld_09', { sage: 3, caregiver: 2 }),
  // ── PROPÓSITO ──
  q('pp_01', { magician: 3, sage: 1 }),
  q('pp_02', { magician: 3, caregiver: 1 }),
  q('pp_03', { creator: 3, ruler: 2 }),
  q('pp_04', { sage: 3, innocent: 1 }),
  q('pp_05', { explorer: 3, magician: 1 }),
  q('pp_06', { caregiver: 3, magician: 1 }),
  q('pp_07', { warrior: 3, magician: 1 }),
  // ── ATUAÇÃO E CARREIRA ──
  q('cr_01', { explorer: 3, rebel: 1 }),
  q('cr_02', { ruler: 3, sage: 2 }),
  q('cr_03', { creator: 3, jester: 1 }),
  q('cr_04', { warrior: 3, sage: 2 }),
  q('cr_05', { explorer: 3, jester: 2 }),
  q('cr_06', { warrior: 3, creator: 2 }),
  q('cr_07', { creator: 3, warrior: 1 }),
  q('cr_08', { ruler: 3, sage: 1 }),
  // ── COMUNICAÇÃO ──
  q('cm_01', { sage: 3, ruler: 1 }),
  q('cm_02', { warrior: 3, ruler: 1 }),
  q('cm_03', { ruler: 3, warrior: 1 }),
  q('cm_04', { caregiver: 3, lover: 1 }),
  q('cm_05', { warrior: 3, rebel: 1 }),
  q('cm_06', { jester: 3, lover: 1 }),
  // ── DESAFIOS (positivos) ──
  q('dc_01', { warrior: 3, sage: 1 }),
  q('dc_02', { explorer: 3, jester: 1 }),
  q('dc_04', { warrior: 3, creator: 1 }),
  // ── POTENCIALIDADES ──
  q('pt_01', { magician: 3, explorer: 1 }),
  q('pt_02', { explorer: 3, sage: 1 }),
  q('pt_03', { ruler: 3, magician: 1 }),
  q('pt_04', { magician: 3, sage: 1 }),
  q('pt_05', { magician: 3, lover: 1 }),
  q('pt_06', { creator: 3, warrior: 1 }),
  q('pt_07', { jester: 3, explorer: 1 }),
  // ── DESENVOLVIMENTO ──
  q('dv_01', { sage: 3, magician: 1 }),
  q('dv_02', { sage: 3, magician: 2 }),
  q('dv_03', { warrior: 3, ruler: 1 }),
  q('dv_04', { sage: 3 }),
  q('dv_05', { magician: 3, creator: 1 }),
  q('dv_06', { ruler: 3, sage: 1 }),
  q('dv_07', { innocent: 3, sage: 1 }),
  q('dv_08', { magician: 3, jester: 1 }),
])

interface ShadowItem {
  id: string
  sombra: ArchetypeId
  ferido: ArchetypeId
}

const SHADOW_ITEMS: Record<string, ShadowItem> = {
  dc_03: { id: 'dc_03', sombra: 'warrior', ferido: 'orphan' },
  dc_05: { id: 'dc_05', sombra: 'innocent', ferido: 'orphan' },
  dc_06: { id: 'dc_06', sombra: 'orphan', ferido: 'orphan' },
  dc_07: { id: 'dc_07', sombra: 'warrior', ferido: 'orphan' },
  dc_08: { id: 'dc_08', sombra: 'orphan', ferido: 'orphan' },
  dc_09: { id: 'dc_09', sombra: 'lover', ferido: 'lover' },
}

const OPEN_KEYS: Record<ArchetypeId, string[]> = {
  rebel: ['questionar', 'questiono', 'padrão', 'regra', 'revolução', 'romper', 'contra a', 'mudar o'],
  sage: ['conhecimento', 'aprendiz', 'aprender', 'compreens', 'entender', 'estudar', 'clareza', 'método', 'consciência', 'pesquisa'],
  innocent: ['simplicidade', 'esperança', 'fé', 'confiar', 'otimismo', 'puro', 'confiança'],
  explorer: ['liberdade', 'independ', 'viajar', 'explorar', 'descobrir', 'aventura', 'horizont', 'novas possibilidades', 'expans'],
  creator: ['criar', 'criativo', 'criatividade', 'inovar', 'inovação', 'construir', 'ideias novas', 'original', 'empreender'],
  ruler: ['liderar', 'liderança', 'conduzir', 'organizar', 'decisão', 'decidir', 'sucesso', 'responsabilidade', 'equipe', 'gestão', 'impactar'],
  caregiver: ['cuidar', 'cuidado', 'ajudar', 'ajuda', 'acolher', 'acolhimento', 'acolhedor', 'proteger', 'proteção', 'apoiar', 'apoio', 'pessoas', 'família', 'amor'],
  magician: ['transformar', 'transformação', 'propósito', 'intuição', 'cura', 'evoluir', 'evolução', 'espiritual', 'renascer', 'mudança', 'despertar'],
  jester: ['leveza', 'humor', 'alegria', 'rir', 'espontâneo', 'brincar', 'felicidade', 'lúdico', 'leve'],
  lover: ['conexão', 'conectar', 'afeto', 'sentimento', 'belez', 'encant', 'sensibilidade', 'relacionamento', 'vínculo', 'parceria', 'com amor'],
  warrior: ['coragem', 'força', 'disciplina', 'determinação', 'persistência', 'foco', 'superar', 'superação', 'desafio', 'lutar', 'vencer', 'resiliência'],
  orphan: ['pertencer', 'pertencimento', 'solidão', 'abandono', 'rejeição', 'desamparo', 'aceitação', 'grupo', 'ajuda'],
}

const NEGATIVE_HINTS = [
  'não',
  'nunca',
  'evito',
  'evitar',
  'tenho dificuldade',
  'tenho medo',
  'dificuldade',
  'medo',
  'não gosto',
  'não consigo',
  'detesto',
  'longe de mim',
]

function toNumber(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export interface ArchetypeScore {
  archetypeId: ArchetypeId
  label: string
  percentage: number
  answered: number
  total: number
}

export function compareScores(a: ArchetypeScore, b: ArchetypeScore): number {
  return (
    b.percentage - a.percentage ||
    b.answered - a.answered ||
    a.label.localeCompare(b.label)
  )
}

export function weightedArchetypeScores(
  questions: Question[],
  answers: Participant['answers'] | null | undefined,
  axes: string[] = PERSON_AXES,
): ArchetypeScore[] {
  const map = new Map<ArchetypeId, { sum: number; max: number; answered: number; total: number }>()
  for (const id of ARCHETYPE_IDS) map.set(id, { sum: 0, max: 0, answered: 0, total: 0 })

  for (const qq of questions) {
    if (qq.module !== 'person' || qq.type !== 'likert' || qq.archetype === 'shadow') continue
    if (axes.length > 0 && !axes.includes(qq.axis)) continue
    const weights = WEIGHT_MAP[qq.id]
    if (!weights) continue
    const value = toNumber(answers?.[qq.id])
    for (const [arch, w] of Object.entries(weights) as [ArchetypeId, number][]) {
      const entry = map.get(arch)!
      entry.total += 1
      if (value !== null) {
        entry.sum += w * value
        entry.max += w * 5
        entry.answered += 1
      }
    }
  }

  return ARCHETYPE_IDS.map((id) => {
    const entry = map.get(id)!
    const percentage =
      entry.max > 0 ? Math.round((entry.sum / entry.max) * 100) : 0
    return {
      archetypeId: id,
      label: ARCHETYPE_META[id].label,
      percentage,
      answered: entry.answered,
      total: entry.total,
    }
  })
}

export interface OpenAdjustment {
  archetypeId: ArchetypeId
  archetypeLabel: string
  delta: number
  evidence: string
}

export function openEvidenceAdjustments(
  openAnswers: { provided: boolean; answer: string }[],
  scores: ArchetypeScore[],
): OpenAdjustment[] {
  const texts = openAnswers.filter((o) => o.provided && o.answer.trim()).map((o) => normalize(o.answer))
  const adjustments: OpenAdjustment[] = []

  for (const score of scores) {
    const keys = OPEN_KEYS[score.archetypeId].map(normalize)
    let positive = 0
    let negative = 0
    for (const text of texts) {
      for (const key of keys) {
        const pattern = new RegExp(key, 'g')
        const matches = text.match(pattern)
        if (matches) positive += matches.length
      }
      if (keys.some((key) => text.includes(key)) && NEGATIVE_HINTS.some((hint) => text.includes(normalize(hint)))) {
        negative += 1
      }
    }
    const delta = (positive >= 2 ? 5 : 0) + (negative >= 1 ? -5 : 0)
    if (delta !== 0) {
      adjustments.push({
        archetypeId: score.archetypeId,
        archetypeLabel: score.label,
        delta,
        evidence:
          delta > 0
            ? `Evidência textual forte (${positive} menções) nas respostas abertas.`
            : `Evidência textual de baixa presença (${negative} resposta(s) com negação).`,
      })
    }
  }
  return adjustments
}

export interface LayerResult {
  key: 'dominante' | 'secundario' | 'potencia' | 'sombra' | 'ferido' | 'evolucao'
  label: string
  subtitle: string
  archetypeId: ArchetypeId | null
  archetypeLabel: string | null
  essence: string[]
  percentage: number | null
  basis: string[]
  note?: string
}

export interface ShadowScore {
  id: string
  percentage: number
  answered: boolean
}

function shadowScored(
  questions: Question[],
  answers: Participant['answers'] | null | undefined,
  key: 'sombra' | 'ferido',
): { groups: Map<ArchetypeId, { values: number[] }>; items: ShadowScore[] } {
  const groups = new Map<ArchetypeId, { values: number[] }>()
  const items: ShadowScore[] = []
  for (const qq of questions) {
    const item = SHADOW_ITEMS[qq.id]
    if (!item) continue
    const target = key === 'sombra' ? item.sombra : item.ferido
    if (!groups.has(target)) groups.set(target, { values: [] })
    const n = toNumber(answers?.[qq.id])
    if (n !== null) groups.get(target)!.values.push(n)
    items.push({ id: qq.id, percentage: n === null ? 0 : Math.round((n / 5) * 100), answered: n !== null })
  }
  return { groups, items }
}

function percentile(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.round((mean / 5) * 100)
}

function shadowLayer(
  key: 'sombra' | 'ferido',
  questions: Question[],
  answers: Participant['answers'] | null | undefined,
  label: string,
  subtitle: string,
  note: string,
): LayerResult {
  const { groups, items } = shadowScored(questions, answers, key)
  const best = [...groups.entries()].sort(
    (a, b) => percentile(b[1].values) - percentile(a[1].values),
  )[0]
  const answeredCount = items.filter((i) => i.answered).length
  return {
    key,
    label,
    subtitle,
    archetypeId: best ? best[0] : null,
    archetypeLabel: best ? ARCHETYPE_META[best[0]].label : null,
    essence: best ? ARCHETYPE_META[best[0]].essence : [],
    percentage: best ? percentile(best[1].values) : null,
    basis: answeredCount > 0 ? [`${answeredCount} de ${items.length} itens de padrão respondidos`] : [],
    note,
  }
}

export interface AxisResult {
  axis: string
  label: string
  mean: number | null
  answered: number
  total: number
}

export function axisResults(
  questions: Question[],
  answers: Participant['answers'] | null | undefined,
): AxisResult[] {
  const map = new Map<string, { values: number[]; total: number }>()
  for (const qq of questions) {
    if (qq.module !== 'person' || qq.type !== 'likert') continue
    if (qq.archetype === 'shadow') continue
    if (!map.has(qq.axis)) map.set(qq.axis, { values: [], total: 0 })
    const entry = map.get(qq.axis)!
    entry.total += 1
    const n = toNumber(answers?.[qq.id])
    if (n !== null) entry.values.push(n)
  }

  return [...map.entries()].map(([axis, entry]) => {
    const mean =
      entry.values.length === 0
        ? null
        : entry.values.reduce((a, b) => a + b, 0) / entry.values.length
    return {
      axis,
      label: AXIS[axis]?.label ?? axis,
      mean,
      answered: entry.values.length,
      total: entry.total,
    }
  })
}

export interface OpenAnswer {
  id: string
  question: string
  answer: string
  provided: boolean
}

export function openAnswers(
  questions: Question[],
  answers: Participant['answers'] | null | undefined,
): OpenAnswer[] {
  return questions
    .filter((q) => q.axis === 'open')
    .map((q) => {
      const value = answers?.[q.id]
      const provided = hasAnswer(value)
      return {
        id: q.id,
        question: q.text,
        answer: provided ? String(value) : '',
        provided,
      }
    })
}

export interface IntelligencePattern {
  title: string
  text: string
}

export interface ClinicalFlag {
  point: string
  evidence: string
}

export interface IntelligenceReport {
  participantId: string
  name: string
  completed: boolean
  answeredLikert: number
  totalLikert: number
  confidence: 'alta' | 'media' | 'baixa'
  confidenceReason: string
  scores: ArchetypeScore[]
  rawScores: ArchetypeScore[]
  adjustments: OpenAdjustment[]
  dominante: LayerResult
  secundario: LayerResult
  potencia: LayerResult
  sombra: LayerResult
  ferido: LayerResult
  evolucao: LayerResult
  layers: LayerResult[]
  axes: AxisResult[]
  open: OpenAnswer[]
  executiveSummary: string
  patterns: IntelligencePattern[]
  flags: ClinicalFlag[]
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))

export function buildIntelligenceReport(
  participant: Participant,
  questions: Question[],
): IntelligenceReport {
  const answers = participant.answers ?? {}
  const rawScores = weightedArchetypeScores(questions, answers)
  const open = openAnswers(questions, answers)
  const adjustments = openEvidenceAdjustments(open, rawScores)
  const scores = rawScores.map((s) => {
    const adj = adjustments.find((a) => a.archetypeId === s.archetypeId)
    return { ...s, percentage: adj ? clamp(s.percentage + adj.delta) : s.percentage }
  })

  const ranked = [...scores].filter((s) => s.answered > 0).sort(compareScores)
  const dom = ranked[0] ?? null
  const sec = ranked[1] ?? null

  const potenciaScores = weightedArchetypeScores(questions, answers, POTENCIA_AXES)
    .filter((s) => s.answered > 0)
    .sort(compareScores)
  const potenciaTop = potenciaScores[0] ?? null

  const evolucaoScores = weightedArchetypeScores(questions, answers, EVOLUCAO_AXES)
    .filter((s) => s.answered > 0)
    .sort(compareScores)
  const evolucaoTop = evolucaoScores[0] ?? null

  const layers: LayerResult[] = [
    {
      key: 'dominante',
      label: 'Arquétipo Dominante',
      subtitle: 'Quem a pessoa acredita ser',
      archetypeId: dom ? dom.archetypeId : null,
      archetypeLabel: dom ? dom.label : null,
      essence: dom ? ARCHETYPE_META[dom.archetypeId].essence : [],
      percentage: dom ? dom.percentage : null,
      basis: dom ? [`${dom.answered} de ${dom.total} itens ponderados`, 'Todas as perguntas likert do eixo pessoa'] : [],
      note: dom && dom.answered < dom.total ? `Baseado em ${dom.answered} de ${dom.total} itens do arquétipo.` : undefined,
    },
    {
      key: 'secundario',
      label: 'Arquétipo Secundário',
      subtitle: 'Complementa e sustenta a identidade',
      archetypeId: sec ? sec.archetypeId : null,
      archetypeLabel: sec ? sec.label : null,
      essence: sec ? ARCHETYPE_META[sec.archetypeId].essence : [],
      percentage: sec ? sec.percentage : null,
      basis: sec ? [`${sec.answered} de ${sec.total} itens ponderados`] : [],
      note: sec ? undefined : 'Não há pontuação secundária suficiente.',
    },
    {
      key: 'potencia',
      label: 'Arquétipo de Potência',
      subtitle: 'Potencial ainda não desenvolvido',
      archetypeId: potenciaTop ? potenciaTop.archetypeId : null,
      archetypeLabel: potenciaTop ? potenciaTop.label : null,
      essence: potenciaTop ? ARCHETYPE_META[potenciaTop.archetypeId].essence : [],
      percentage: potenciaTop ? potenciaTop.percentage : null,
      basis: ['Eixo Potencialidades (pt_*)'],
      note: potenciaTop && potenciaTop.percentage < 60 ? 'Potência percebida ainda moderada — espaço para desenvolvimento.' : undefined,
    },
    shadowLayer(
      'sombra',
      questions,
      answers,
      'Arquétipo Sombra',
      'O padrão inconsciente que sabota',
      'Calculado a partir dos itens do eixo Desafios que descrevem padrões de comportamento defensivo.',
    ),
    shadowLayer(
      'ferido',
      questions,
      answers,
      'Arquétipo Ferido',
      'Onde existe dor emocional',
      'Calculado a partir dos itens que descrevem necessidade de aprovação, comparação e sensibilidade à crítica.',
    ),
    {
      key: 'evolucao',
      label: 'Arquétipo de Evolução',
      subtitle: 'Próxima etapa da jornada',
      archetypeId: evolucaoTop ? evolucaoTop.archetypeId : null,
      archetypeLabel: evolucaoTop ? evolucaoTop.label : null,
      essence: evolucaoTop ? ARCHETYPE_META[evolucaoTop.archetypeId].essence : [],
      percentage: evolucaoTop ? evolucaoTop.percentage : null,
      basis: ['Eixos Propósito (pp_*) e Desenvolvimento (dv_*)'],
      note: undefined,
    },
  ]

  const axes = axisResults(questions, answers)
  const likertQuestions = questions.filter(
    (q) => q.module === 'person' && q.type === 'likert' && q.archetype !== 'shadow',
  )
  const answeredLikert = likertQuestions.filter((q) => hasAnswer(answers[q.id])).length
  const totalLikert = likertQuestions.length

  const answeredAxes = axes.filter((a) => a.answered > 0)
  const sortedAxes = [...answeredAxes].sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))
  const highestAxis = sortedAxes[0] ?? null
  const lowestAxis = sortedAxes.length > 1 ? sortedAxes[sortedAxes.length - 1] : null

  let confidence: IntelligenceReport['confidence'] = 'alta'
  let confidenceReason = 'Volume de respostas e separação entre os principais índices adequados.'
  if (answeredLikert < totalLikert * 0.5) {
    confidence = 'baixa'
    confidenceReason = `Apenas ${answeredLikert} de ${totalLikert} itens respondidos — insuficiente para leitura estável.`
  } else if (dom && sec && dom.percentage - sec.percentage < 5) {
    confidence = 'media'
    confidenceReason = `Os índices ${dom.label} (${dom.percentage}%) e ${sec.label} (${sec.percentage}%) estão próximos — a distinção entre os arquétipos principais é moderada.`
  }

  const domEssence = dom ? ARCHETYPE_META[dom.archetypeId].essence.join(', ') : ''
  const executiveSummary = dom
    ? `Perfil com predominância do arquétipo ${dom.label} (${dom.percentage}%), caracterizado por ${domEssence}, sustentado por ${sec ? `${sec.label} (${sec.percentage}%)` : 'nenhum arquétipo secundário definido'}. A leitura indica ${highestAxis ? `o eixo ${highestAxis.label} (média ${(highestAxis.mean ?? 0).toFixed(2)}) como o mais expressivo` : 'sem eixo expressivo mensurável'}${lowestAxis && lowestAxis !== highestAxis ? ` e ${lowestAxis.label} (média ${(lowestAxis.mean ?? 0).toFixed(2)}) como o menos expressivo` : ''}. ${layers[3].archetypeLabel ? `O arquétipo ${layers[3].archetypeLabel} (${layers[3].percentage}%) emerge como padrão de atenção na camada sombra.` : ''}`
    : 'Sem respostas suficientes para síntese.'

  const patterns: IntelligencePattern[] = []
  const flags: ClinicalFlag[] = []

  if (highestAxis && highestAxis.mean !== null) {
    patterns.push({
      title: 'Eixo mais expressivo',
      text: `O eixo com maior média de concordância foi ${highestAxis.label} (média ${highestAxis.mean.toFixed(2)} de 5), a partir de ${highestAxis.answered} itens respondidos.`,
    })
  }
  if (lowestAxis && lowestAxis !== highestAxis && lowestAxis.mean !== null) {
    patterns.push({
      title: 'Eixo menos expressivo',
      text: `O eixo com menor média foi ${lowestAxis.label} (média ${lowestAxis.mean.toFixed(2)} de 5), a partir de ${lowestAxis.answered} itens respondidos.`,
    })
  }

  const sombraValues = shadowScored(questions, answers, 'sombra')
  const sombraItems = sombraValues.items.filter((i) => i.answered)
  const sombraMean = sombraItems.length > 0
    ? sombraItems.reduce((acc, i) => acc + i.percentage, 0) / sombraItems.length
    : null
  if (sombraMean !== null) {
    patterns.push({
      title: 'Padrões defensivos',
      text: `Os itens de padrão sombra tiveram intensidade média de ${sombraMean.toFixed(0)}%. ${
        sombraMean >= 70
          ? 'É o bloco mais forte do levantamento — merece leitura atenta no contexto da pessoa.'
          : sombraMean >= 50
            ? 'A presença é moderada, variando por contexto.'
            : 'Presença baixa no conjunto.'
      }`,
    })
  }

  const providedOpen = open.filter((o) => o.provided).length
  if (providedOpen > 0) {
    patterns.push({
      title: 'Registros abertos',
      text: `${providedOpen} de ${open.length} reflexões abertas foram preenchidas e estão preservadas na íntegra abaixo.`,
    })
  }

  if (adjustments.length > 0) {
    patterns.push({
      title: 'Ajuste por evidência textual',
      text: `As respostas abertas ajustaram ${adjustments.length} índice(s) em ±5 pontos: ${adjustments
        .map((a) => `${a.archetypeLabel} ${a.delta > 0 ? '+' : ''}${a.delta}`)
        .join(', ')}.`,
    })
  }

  if (dom && sec && dom.archetypeId === sec.archetypeId) {
    patterns.push({
      title: 'Arquétipo único dominante',
      text: `O arquétipo ${dom.label} concentra a maior parte das pontuações, sem um segundo arquétipo próximo.`,
    })
  } else if (dom && sec && sec.percentage >= dom.percentage - 8) {
    patterns.push({
      title: 'Diade arquetípica',
      text: `${dom.label} e ${sec.label} estão próximos (${dom.percentage}% e ${sec.percentage}%) — possivelmente atuando em conjunto.`,
    })
  }

  if (sombraMean !== null && sombraMean >= 70) {
    flags.push({
      point: 'Intensidade de padrões sombra elevada',
      evidence: `Média de ${sombraMean.toFixed(0)}% nos itens defensivos (eixo Desafios). Verificar contexto e histórico.`,
    })
  }

  if (providedOpen > 0) {
    flags.push({
      point: 'Respostas abertas disponíveis',
      evidence: `${providedOpen} reflexões escritas — sugerem leitura qualitativa individual (seção 3 abaixo).`,
    })
  }

  const blankOpen = open.filter((o) => !o.provided)
  if (blankOpen.length > 0) {
    flags.push({
      point: 'Reflexões abertas em branco',
      evidence: `${blankOpen.length} pergunta(s) aberta(s) sem resposta. Não há conteúdo para análise nesses itens.`,
    })
  }

  const feridoValues = shadowScored(questions, answers, 'ferido')
  const feridoHigh = feridoValues.items.filter((i) => i.answered && i.percentage >= 80)
  if (feridoHigh.length > 0) {
    flags.push({
      point: 'Pontos de dor com concordância máxima',
      evidence: `${feridoHigh.length} item(ns) do eixo Desafios marcados com 5 (Concordo totalmente): ${feridoHigh.map((i) => i.id).join(', ')}.`,
    })
  }

  const lowAxes = answeredAxes.filter((a) => a.mean !== null && a.mean < 2.5)
  if (lowAxes.length > 0) {
    flags.push({
      point: 'Eixos com média baixa',
      evidence: `${lowAxes.map((a) => `${a.label} (${(a.mean ?? 0).toFixed(2)})`).join(', ')}.`,
    })
  }

  if (dom && potenciaTop && dom.archetypeId !== potenciaTop.archetypeId) {
    flags.push({
      point: 'Divergência entre dominante e potência',
      evidence: `Quem a pessoa acredita ser (${dom.label}) difere do potencial percebido (${potenciaTop.label}) — possível espaço de expansão.`,
    })
  }

  return {
    participantId: participant.id,
    name: participant.name ?? 'Participante',
    completed: participant.status === 'concluido',
    answeredLikert,
    totalLikert,
    confidence,
    confidenceReason,
    scores,
    rawScores,
    adjustments,
    dominante: layers[0],
    secundario: layers[1],
    potencia: layers[2],
    sombra: layers[3],
    ferido: layers[4],
    evolucao: layers[5],
    layers,
    axes,
    open,
    executiveSummary,
    patterns,
    flags,
  }
}

export function likertLabel(value: string | string[] | undefined): string {
  if (typeof value !== 'string') return ''
  const n = Number(value)
  const scale = LIKERT_SCALE.find((s) => s.value === n)
  return scale ? scale.label : ''
}
