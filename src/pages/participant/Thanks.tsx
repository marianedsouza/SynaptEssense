import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'

export function Thanks() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-se-mist px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-se-mist to-se-lavender/60" />
      <NeuralBackground className="opacity-60" />

      <div className="relative z-10 mx-auto max-w-2xl text-center animate-fade-up">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-10 font-display text-4xl font-semibold text-ink md:text-5xl">
          Obrigado por participar.
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-ink-soft">
          Recebemos suas respostas com sucesso.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          Agora elas passarão por uma análise individual dentro da metodologia
          SynaptEssence360®.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          O próximo passo será a devolutiva, na qual os principais aspectos
          identificados serão apresentados e poderão subsidiar a construção de
          um Plano Estratégico de Desenvolvimento.
        </p>

        <div className="mx-auto mt-12 max-w-md border-t border-ink/10 pt-8">
          <p className="font-display text-lg italic leading-relaxed text-se-violet-dark">
            “Toda transformação começa quando novas conexões são criadas.”
          </p>
        </div>
      </div>
    </div>
  )
}
