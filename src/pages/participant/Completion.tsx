import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { ParticipantLayout } from '../../components/ParticipantLayout'
import { clearSession } from '../../lib/participants'

export function Completion() {
  const navigate = useNavigate()

  const handleFinish = () => {
    clearSession()
    navigate('/minha-area', { replace: true })
  }

  return (
    <ParticipantLayout>
      <div className="flex flex-col items-center pt-8 text-center animate-fade-up">
        <div className="bg-grad grid h-20 w-20 place-items-center rounded-full shadow-lift">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h1 className="mt-8 font-display text-3xl font-semibold text-ink md:text-4xl">
          Levantamento concluído.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-soft">
          Você acabou de concluir seu levantamento.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-ink-soft">
          Suas respostas foram registradas com sucesso e serão analisadas
          individualmente.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-ink-soft">
          A devolutiva e o acompanhamento acontecem em suas sessões com a
          analista — você não recebe resultados por aqui.
        </p>
        <button onClick={handleFinish} className="btn-primary mt-10">
          Voltar para minha área
        </button>
      </div>
    </ParticipantLayout>
  )
}
