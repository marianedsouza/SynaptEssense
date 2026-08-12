import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock, Sparkles, ListChecks } from 'lucide-react'
import { ParticipantLayout } from '../../components/ParticipantLayout'

export function BeforeStart() {
  const navigate = useNavigate()

  return (
    <ParticipantLayout>
      <div className="animate-fade-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
          Um momento antes
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink md:text-4xl">
          Antes de começar
        </h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <Clock className="h-6 w-6 text-se-violet" />
            <div className="mt-3 text-sm font-semibold text-ink">Tempo estimado</div>
            <p className="mt-1 text-sm text-ink-soft">10 a 15 minutos</p>
          </div>
          <div className="card p-5">
            <Sparkles className="h-6 w-6 text-se-green" />
            <div className="mt-3 text-sm font-semibold text-ink">Experiência</div>
            <p className="mt-1 text-sm text-ink-soft">Uma jornada contínua</p>
          </div>
          <div className="card p-5">
            <ListChecks className="h-6 w-6 text-se-teal" />
            <div className="mt-3 text-sm font-semibold text-ink">Respostas</div>
            <p className="mt-1 text-sm text-ink-soft">
              Não existem respostas certas ou erradas
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-se-violet/15 bg-se-lavender/40 p-6">
          <p className="text-sm leading-relaxed text-ink-soft md:text-base">
            Reserve um momento tranquilo para realizar seu levantamento. O ideal
            é concluir a experiência em uma única sessão e responder de maneira
            espontânea, considerando aquilo que realmente representa você.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft md:text-base">
            Suas respostas serão salvas durante o preenchimento para reduzir o
            risco de perda de progresso.
          </p>
        </div>

        <div className="mt-10">
          <button onClick={() => navigate('/consentimento')} className="btn-primary group">
            Estou pronto(a)
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </ParticipantLayout>
  )
}
