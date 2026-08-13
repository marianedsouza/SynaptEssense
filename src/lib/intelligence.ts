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

function toNumber(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null
}

function percentile(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.round((mean / 5) * 100)
}

export function compareScores(a: ArchetypeScore, b: ArchetypeScore): number {
  return (
    b.percentage - a.percentage ||
    b.answered - a.answered ||
    a.label.localeCompare(b.label)
  )
}

export interface ArchetypeScore {
  archetypeId: ArchetypeId
  label: string
  percentage: number
  answered: number
  total: number
}

export function archetypeScores(
  questions: Question[],
  answers: Participant['answers'] | null | undefined,
  axes: string[] = PERSON_AXES,
): ArchetypeScore[] {
  const map = new Map<ArchetypeId, { values: number[]; total: number }>()
  for (const id of ARCHETYPE_IDS) map.set(id, { values: [], total: 0 })

  for (const q of questions) {
    if (q.module !== 'person' || q.type !== 'likert' || q.archetype === 'shadow') continue
    if (axes.length > 0 && !axes.includes(q.axis)) continue
    const archetype = q.archetype as ArchetypeId | undefined
    if (!archetype || !map.has(archetype)) continue
    const entry = map.get(archetype)!
    entry.total += 1
    const n = toNumber(answers?.[q.id])
    if (n !== null) entry.values.push(n)
  }

  return ARCHETYPE_IDS.map((id) => {
    const entry = map.get(id)!
    return {
      archetypeId: id,
      label: ARCHETYPE_META[id].label,
      percentage: percentile(entry.values),
      answered: entry.values.length,
      total: entry.total,
    }
  })
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
  for (const q of questions) {
    const item = SHADOW_ITEMS[q.id]
    if (!item) continue
    const target = key === 'sombra' ? item.sombra : item.ferido
    if (!groups.has(target)) groups.set(target, { values: [] })
    const n = toNumber(answers?.[q.id])
    if (n !== null) groups.get(target)!.values.push(n)
    items.push({ id: q.id, percentage: n === null ? 0 : Math.round((n / 5) * 100), answered: n !== null })
  }
  return { groups, items }
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
  for (const q of questions) {
    if (q.module !== 'person' || q.type !== 'likert') continue
    if (q.archetype === 'shadow') continue
    if (!map.has(q.axis)) map.set(q.axis, { values: [], total: 0 })
    const entry = map.get(q.axis)!
    entry.total += 1
    const n = toNumber(answers?.[q.id])
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
  scores: ArchetypeScore[]
  dominante: LayerResult
  secundario: LayerResult
  potencia: LayerResult
  sombra: LayerResult
  ferido: LayerResult
  evolucao: LayerResult
  layers: LayerResult[]
  axes: AxisResult[]
  open: OpenAnswer[]
  patterns: IntelligencePattern[]
  flags: ClinicalFlag[]
}

export function buildIntelligenceReport(
  participant: Participant,
  questions: Question[],
): IntelligenceReport {
  const answers = participant.answers ?? {}
  const scores = archetypeScores(questions, answers)
  const ranked = [...scores]
    .filter((s) => s.answered > 0)
    .sort(compareScores)

  const dom = ranked[0] ?? null
  const sec = ranked[1] ?? null

  const potenciaScores = archetypeScores(questions, answers, POTENCIA_AXES)
    .filter((s) => s.answered > 0)
    .sort(compareScores)
  const potenciaTop = potenciaScores[0] ?? null

  const evolucaoScores = archetypeScores(questions, answers, EVOLUCAO_AXES)
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
      basis: dom ? [`${dom.answered} de ${dom.total} itens respondidos`, 'Todas as perguntas likert do eixo pessoa'] : [],
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
      basis: sec ? [`${sec.answered} de ${sec.total} itens respondidos`] : [],
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
  const open = openAnswers(questions, answers)

  const answeredLikert = scores.reduce((acc, s) => acc + s.answered, 0)
  const totalLikert = scores.reduce((acc, s) => acc + s.total, 0)

  const patterns: IntelligencePattern[] = []
  const flags: ClinicalFlag[] = []

  const answeredAxes = axes.filter((a) => a.answered > 0)
  if (answeredAxes.length > 0) {
    const sorted = [...answeredAxes].sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))
    const highest = sorted[0]
    const lowest = sorted[sorted.length - 1]
    if (highest && highest.mean !== null) {
      patterns.push({
        title: 'Eixo mais expressivo',
        text: `O eixo com maior média de concordância foi ${highest.label} (média ${highest.mean.toFixed(2)} de 5), a partir de ${highest.answered} itens respondidos.`,
      })
    }
    if (lowest && lowest !== highest && lowest.mean !== null) {
      patterns.push({
        title: 'Eixo menos expressivo',
        text: `O eixo com menor média foi ${lowest.label} (média ${lowest.mean.toFixed(2)} de 5), a partir de ${lowest.answered} itens respondidos.`,
      })
    }
  }

  const sombraValues = shadowScored(questions, answers, 'sombra')
  const sombraMean =
    sombraValues.items.filter((i) => i.answered).length > 0
      ? sombraValues.items
          .filter((i) => i.answered)
          .reduce((acc, i) => acc + i.percentage, 0) /
        sombraValues.items.filter((i) => i.answered).length
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

  const highWound = open
    .filter((o) => o.provided && o.answer.trim().length > 0)
    .map((o) => o)
  if (highWound.length > 0) {
    flags.push({
      point: 'Respostas abertas disponíveis',
      evidence: `${highWound.length} reflexões escritas — sugerem leitura qualitativa individual (aba Respostas e seção abaixo).`,
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
    scores,
    dominante: layers[0],
    secundario: layers[1],
    potencia: layers[2],
    sombra: layers[3],
    ferido: layers[4],
    evolucao: layers[5],
    layers,
    axes,
    open,
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
