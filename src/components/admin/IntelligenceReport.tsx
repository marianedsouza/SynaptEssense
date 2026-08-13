import { useMemo } from 'react'
import {
  AlertCircle,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Quote,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import {
  ARCHETYPE_META,
  buildIntelligenceReport,
  compareScores,
  type ArchetypeScore,
  type LayerResult,
} from '../../lib/intelligence'
import type { Participant, Question } from '../../lib/types'

interface IntelligenceReportProps {
  participant: Participant
  questions: Question[]
}

const CONFIDENCE_BADGE: Record<string, string> = {
  alta: 'bg-se-green-soft text-se-green',
  media: 'bg-amber-50 text-amber-700',
  baixa: 'bg-red-50 text-red-600',
}

function scoreRow(score: ArchetypeScore, rank: number) {
  const meta = ARCHETYPE_META[score.archetypeId]
  return (
    <div key={score.archetypeId} className="flex items-center gap-3">
      <span className="w-6 text-right text-xs font-semibold tabular-nums text-ink-muted">
        {rank}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-ink">{meta.label}</span>
          <span className="text-sm font-semibold tabular-nums text-ink">
            {score.percentage}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink/5">
          <div
            className={`h-full rounded-full ${meta.bar} transition-all`}
            style={{ width: `${score.percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function layerCard(layer: LayerResult, index: number) {
  if (!layer.archetypeId) {
    return (
      <div key={layer.key} className="rounded-2xl border border-ink/5 bg-se-mist/50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {layer.label}
        </p>
        <p className="mt-2 text-sm text-ink-soft">Sem dados suficientes.</p>
      </div>
    )
  }
  const meta = ARCHETYPE_META[layer.archetypeId]
  return (
    <div key={layer.key} className="rounded-2xl border border-ink/5 bg-se-mist/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {index + 1} · {layer.label}
          </p>
          <p className="mt-1 text-xs text-ink-muted">{layer.subtitle}</p>
        </div>
        <span className="text-lg font-semibold tabular-nums text-se-violet">
          {layer.percentage}%
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${meta.badge}`}>
          {meta.label}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {layer.essence.map((e) => (
          <span
            key={e}
            className="rounded-full border border-ink/10 px-2 py-0.5 text-[11px] text-ink-soft"
          >
            {e}
          </span>
        ))}
      </div>
      {layer.note && <p className="mt-3 text-xs italic text-ink-muted">{layer.note}</p>}
      {layer.basis.length > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
          Base: {layer.basis.join(' · ')}
        </p>
      )}
    </div>
  )
}

export function IntelligenceReport({ participant, questions }: IntelligenceReportProps) {
  const report = useMemo(
    () => buildIntelligenceReport(participant, questions),
    [participant, questions],
  )

  const ranked = [...report.scores].filter((s) => s.answered > 0).sort(compareScores)
  const answeredAxes = report.axes.filter((a) => a.answered > 0)

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-se-teal via-se-violet to-se-teal-dark p-5 text-white md:p-7">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold md:text-2xl">
              Inteligência SynaptEssence360®
            </h2>
            <p className="text-sm text-white/80">
              Relatório de análise comportamental · {report.name}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">
            {report.answeredLikert} de {report.totalLikert} itens respondidos
          </span>
          <span className={`rounded-full px-3 py-1 ${CONFIDENCE_BADGE[report.confidence] ?? 'bg-white/15'}`}>
            Confiança {report.confidence}
          </span>
          {!report.completed && (
            <span className="rounded-full bg-white/15 px-3 py-1">
              Levantamento não concluído — leitura parcial
            </span>
          )}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-white/75">
          Elaborado por um motor de decisão estruturado: cada pergunta contribui
          com pesos a múltiplos arquétipos; os índices são somados, normalizados
          em percentual e ajustados em até ±5 pontos por evidência textual nas
          respostas abertas. Base metodológica: Carl Jung, Carol Pearson, Joseph
          Campbell, Hajo Banzhaf e Sallie Nichols.
        </p>
      </div>

      {report.answeredLikert === 0 ? (
        <div className="rounded-2xl border border-dashed border-se-violet/30 bg-se-lavender/30 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-se-violet/60" />
          <p className="mt-3 text-sm text-ink-soft">
            Nenhuma resposta de escolha registrada até o momento. O relatório
            arquetípico será gerado quando houver respostas likert.
          </p>
        </div>
      ) : (
        <>
          <section>
            <h3 className="font-display text-lg font-semibold text-ink">
              Resumo executivo
            </h3>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Síntese objetiva derivada dos índices calculados.
            </p>
            <div className="rounded-2xl border border-ink/5 bg-white p-5">
              <p className="text-sm leading-relaxed text-ink-soft">
                {report.executiveSummary}
              </p>
              {report.confidence !== 'alta' && (
                <p className="mt-3 text-xs italic text-ink-muted">
                  Atenção à confiança: {report.confidenceReason}
                </p>
              )}
            </div>
          </section>

          <section>
            <h3 className="font-display text-lg font-semibold text-ink">
              Mapa arquetípico
            </h3>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              As camadas do método, calculadas a partir dos índices ponderados.
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {report.layers.map((layer, i) => layerCard(layer, i))}
            </div>
          </section>

          <section>
            <h3 className="font-display text-lg font-semibold text-ink">
              Metodologia aplicada
            </h3>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Como este relatório foi calculado.
            </p>
            <div className="space-y-3">
              <div className="flex gap-3 rounded-2xl border border-ink/5 bg-white p-4">
                <Scale className="mt-0.5 h-4 w-4 shrink-0 text-se-violet/60" />
                <div>
                  <p className="text-sm font-semibold text-ink">Processamento</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                    Cada pergunta likert soma pesos (3, 2 ou 1) aos arquétipos
                    correspondentes, multiplicados pela escala de 1 a 5. Os totais
                    são normalizados para percentual do máximo possível e os
                    maiores índices compõem as camadas do mapa.
                  </p>
                </div>
              </div>
              {report.adjustments.length > 0 && (
                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Ajuste por evidência textual nas respostas abertas
                    </p>
                    <ul className="mt-1 space-y-1 text-sm leading-relaxed text-amber-900/80">
                      {report.adjustments.map((a) => (
                        <li key={a.archetypeId}>
                          <strong>{a.archetypeLabel}</strong> {a.delta > 0 ? '+' : ''}
                          {a.delta} pontos — {a.evidence}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <div className="flex gap-3 rounded-2xl border border-ink/5 bg-white p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-se-violet/60" />
                <div>
                  <p className="text-sm font-semibold text-ink">Regras do motor</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                    Não diagnostica transtornos; não inventa informações; quando um
                    dado está ausente, registra como não disponível; respostas
                    abertas são preservadas na íntegra e nunca substituídas por
                    interpretação; a decisão interpretativa final é do profissional
                    responsável.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-ink/5 bg-white p-4">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-se-violet/60" />
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Referências do método
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                    Carl Jung (arquétipos, sombra, individuação) · Carol Pearson
                    (os 12 arquétipos) · Joseph Campbell (jornada do herói) ·
                    Hajo Banzhaf e Sallie Nichols (jornada arquetípica).
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-display text-lg font-semibold text-ink">
              1 · Síntese geral dos resultados
            </h3>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Índices ponderados e normalizados, com ajuste textual aplicado.
            </p>
            <div className="space-y-3.5">
              {ranked.map((s, i) => scoreRow(s, i + 1))}
            </div>
          </section>

          <section>
            <h3 className="font-display text-lg font-semibold text-ink">
              2 · Resultados por eixo
            </h3>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Média das respostas likert em cada eixo do questionário (escala de 1
              a 5).
            </p>
            {answeredAxes.length === 0 ? (
              <p className="text-sm text-ink-muted">Sem respostas registradas.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {answeredAxes.map((axis) => (
                  <div
                    key={axis.axis}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-ink/5 bg-se-mist/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {axis.label}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {axis.answered} de {axis.total} itens
                      </p>
                    </div>
                    <span className="text-lg font-semibold tabular-nums text-se-violet">
                      {axis.mean === null ? '—' : axis.mean.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="font-display text-lg font-semibold text-ink">
              3 · Respostas abertas preservadas
            </h3>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Conteúdo escrito pelo participante, transcrito na íntegra, com a
              pergunta correspondente. Material primário para a análise
              qualitativa clínica.
            </p>
            <div className="space-y-3">
              {report.open.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-ink/5 bg-se-mist/50 p-4 md:p-5"
                >
                  <p className="text-sm font-medium text-ink">{item.question}</p>
                  {item.provided ? (
                    <p className="mt-2 flex gap-2 whitespace-pre-wrap text-sm leading-relaxed text-se-violet-dark">
                      <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-se-violet/50" />
                      <span>{item.answer}</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-sm italic text-ink-muted">
                      Não disponibilizada.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-display text-lg font-semibold text-ink">
              4 · Padrões identificados nos dados
            </h3>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Observações derivadas diretamente das respostas — não substituem o
              conteúdo original.
            </p>
            {report.patterns.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Padrões suficientes não identificados.
              </p>
            ) : (
              <div className="space-y-3">
                {report.patterns.map((p) => (
                  <div
                    key={p.title}
                    className="flex gap-3 rounded-2xl border border-ink/5 bg-white p-4"
                  >
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-se-violet/60" />
                    <div>
                      <p className="text-sm font-semibold text-ink">{p.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                        {p.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="font-display text-lg font-semibold text-ink">
              5 · Pontos para análise qualitativa clínica
            </h3>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Indicadores objetivos que merecem aprofundamento na conversa
              clínica. A decisão interpretativa final é do profissional
              responsável.
            </p>
            {report.flags.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nenhum sinal objetivo adicional identificado.
              </p>
            ) : (
              <div className="space-y-3">
                {report.flags.map((f) => (
                  <div
                    key={f.point}
                    className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      {f.point}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
                      {f.evidence}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {report.answeredLikert > 0 && (
        <p className="pt-2 text-center text-xs uppercase tracking-[0.2em] text-ink-muted">
          A tecnologia organiza dados. A metodologia gera compreensão.
        </p>
      )}
    </div>
  )
}
