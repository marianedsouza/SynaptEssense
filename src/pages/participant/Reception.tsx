import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ParticipantLayout } from '../../components/ParticipantLayout'
import { clearSession } from '../../lib/participants'

export function Reception() {
  const navigate = useNavigate()

  const handleContinue = () => {
    clearSession()
    navigate('/antes-de-comecar')
  }

  return (
    <ParticipantLayout>
      <div className="animate-fade-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
          Levantamento Estratégico SynaptEssence360®
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink md:text-4xl">
          Olá, seja bem-vindo(a).
        </h1>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-soft">
          <p>
            Antes de iniciarmos sua jornada, queremos conhecer um pouco mais
            sobre você.
          </p>
          <p>
            Responda às perguntas com tranquilidade e espontaneidade. Não
            existem respostas certas ou erradas.
          </p>
          <p>
            Suas respostas serão analisadas individualmente e utilizadas como
            base para uma compreensão mais ampla do seu momento, seus recursos,
            padrões de atuação e possibilidades de desenvolvimento.
          </p>
        </div>
        <div className="mt-10">
          <button onClick={handleContinue} className="btn-primary group">
            Continuar
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </ParticipantLayout>
  )
}
