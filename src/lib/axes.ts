export interface AxisMeta {
  id: string
  label: string
  shortLabel: string
  centralQuestion: string
  description: string
}

export const AXIS: Record<string, AxisMeta> = {
  identity: {
    id: 'identity',
    label: 'Identidade',
    shortLabel: 'Identidade',
    centralQuestion: 'Quem sou e como me percebo?',
    description:
      'Neste momento, vamos olhar para sua forma de se ver, seus valores, sua autenticidade e o que sustenta sua identidade.',
  },
  relationships: {
    id: 'relationships',
    label: 'Relacionamentos',
    shortLabel: 'Relações',
    centralQuestion: 'Como me conecto com as pessoas?',
    description:
      'Agora vamos olhar para seus vínculos, sua confiança, sua colaboração e a forma como você constrói e sustenta relações.',
  },
  leadership: {
    id: 'leadership',
    label: 'Liderança e Autonomia',
    shortLabel: 'Liderança',
    centralQuestion: 'Como exerço influência, liderança e autonomia?',
    description:
      'Vamos observar sua iniciativa, sua forma de decidir, de assumir responsabilidades e de conduzir processos e pessoas.',
  },
  purpose: {
    id: 'purpose',
    label: 'Propósito',
    shortLabel: 'Propósito',
    centralQuestion: 'O que me move?',
    description:
      'Nesta etapa, vamos olhar para o que dá sentido à sua trajetória, suas motivações profundas e o impacto que deseja gerar.',
  },
  career: {
    id: 'career',
    label: 'Atuação e Carreira',
    shortLabel: 'Atuação',
    centralQuestion: 'Como atuo, produzo e contribuo?',
    description:
      'Vamos compreender suas preferências de atuação, seus talentos percebidos e o ambiente em que você tende a render melhor.',
  },
  communication: {
    id: 'communication',
    label: 'Comunicação',
    shortLabel: 'Comunicação',
    centralQuestion: 'Como me expresso e me faço ouvir?',
    description:
      'Agora vamos observar sua forma de comunicar ideias, de conversar, de ouvir e de influenciar por meio da palavra.',
  },
  challenges: {
    id: 'challenges',
    label: 'Desafios',
    shortLabel: 'Desafios',
    centralQuestion: 'Como respondo diante da pressão e dos desafios?',
    description:
      'Vamos olhar para sua forma de reagir a situações de pressão, mudanças, frustrações e conflitos. Não existem respostas certas ou erradas.',
  },
  potential: {
    id: 'potential',
    label: 'Potencialidades',
    shortLabel: 'Potenciais',
    centralQuestion: 'Quais capacidades posso desenvolver ainda mais?',
    description:
      'Nesta etapa, vamos reconhecer recursos, talentos e capacidades que podem ser ainda mais desenvolvidos.',
  },
  development: {
    id: 'development',
    label: 'Desenvolvimento',
    shortLabel: 'Desenvolvimento',
    centralQuestion: 'Como construo quem estou me tornando?',
    description:
      'Para encerrar esta parte, vamos refletir sobre seu processo de crescimento, suas contradições e suas possibilidades de transformação.',
  },
  open: {
    id: 'open',
    label: 'Reflexões',
    shortLabel: 'Reflexões',
    centralQuestion: 'O que você deseja expressar livremente?',
    description:
      'Algumas perguntas abertas para você registrar, com suas palavras, aquilo que é mais importante neste momento.',
  },
  brand: {
    id: 'brand',
    label: 'Marca / Organização',
    shortLabel: 'Marca',
    centralQuestion: 'Qual é a essência do projeto que você representa?',
    description:
      'Como este levantamento também envolve uma marca, empresa ou organização, vamos olhar para a essência desse projeto.',
  },
}

export const AXIS_ORDER = [
  'identity',
  'relationships',
  'leadership',
  'purpose',
  'career',
  'communication',
  'challenges',
  'potential',
  'development',
  'open',
  'brand',
]

export const AXIS_LABELS: Record<string, string> = {
  identity: 'Identidade',
  relationships: 'Relacionamentos',
  leadership: 'Liderança',
  purpose: 'Propósito',
  career: 'Atuação',
  communication: 'Comunicação',
  challenges: 'Desafios',
  potential: 'Potenciais',
  development: 'Desenvolvimento',
  open: 'Reflexões',
  brand: 'Marca',
}
