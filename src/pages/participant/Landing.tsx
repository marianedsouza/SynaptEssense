import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Link2,
  MessageCircle,
  X,
} from 'lucide-react'
import { NeuralBackground } from '../../components/NeuralBackground'
import { Logo } from '../../components/Logo'
import { AnalystCard } from '../../components/AnalystCard'
import type { AnalystProfile } from '../../lib/types'

const SHARE_MESSAGE =
  'SynaptEssence360® — Plataforma de Tecnologia Social para o Desenvolvimento Humano Integral. Toda transformação começa quando novas conexões são criadas. Faça o seu levantamento estratégico:'

interface LandingProps {
  analystProfile?: AnalystProfile
  heroMessage: string
}

export function Landing({ analystProfile, heroMessage }: LandingProps) {
  const navigate = useNavigate()
  const [showMethodology, setShowMethodology] = useState(false)
  const [copied, setCopied] = useState(false)

  const scrollToShare = () => {
    document
      .getElementById('compartilhar')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${SHARE_MESSAGE} ${window.location.href}`)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = window.location.href
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-se-mist">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-se-mist to-se-lavender/60" />
      <NeuralBackground className="opacity-40" />

      <header className="relative z-10 px-6 py-6 md:px-12">
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-se-violet/20 bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-se-violet backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-se-teal animate-pulse-dot" />
            Mapeamento Estrat&#233;gico de Desenvolvimento Humano
          </div>

          <div className="mb-8 flex justify-center">
            <Logo size="xl" />
          </div>

          <p className="mt-3 text-sm font-medium uppercase tracking-[0.18em] text-ink-soft md:text-base">
            Plataforma de Tecnologia Social para o Desenvolvimento Humano Integral
          </p>

          <div className="mx-auto mt-8 max-w-2xl">
            <div className="relative overflow-hidden rounded-2xl border border-se-violet/10 px-8 py-6 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-se-teal/6 via-se-violet/8 to-se-teal-light/6 animate-[shimmer_8s_ease-in-out_infinite] [background-size:200%_100%]" />
              <p className="relative font-display text-xl font-bold italic leading-relaxed bg-gradient-to-r from-se-teal via-se-violet to-se-teal-light bg-clip-text text-transparent animate-[shimmer_6s_ease-in-out_infinite] [background-size:200%_100%] md:text-2xl">
                {`\u201C${heroMessage}\u201D`}
              </p>
              <button
                onClick={scrollToShare}
                className="relative mx-auto mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-se-violet/80 transition hover:text-se-violet md:hidden"
                aria-label="Rolar até os botões de compartilhar"
              >
                Compartilhar
                <ChevronDown className="h-4 w-4 animate-bounce" />
              </button>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-ink-muted md:text-base">
            Uma experi&#234;ncia de levantamento estrat&#233;gico desenvolvida para ampliar
            a compreens&#227;o sobre sua forma de pensar, agir, se relacionar, decidir
            e se posicionar.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate('/recepcao')}
              className="btn-primary group"
            >
              Iniciar levantamento
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => setShowMethodology(true)}
              className="btn-secondary"
            >
              <BookOpen className="h-4 w-4" />
              Conhe&#231;a a metodologia
            </button>
          </div>

          <div
            id="compartilhar"
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center scroll-mt-6"
          >
            <button onClick={handleWhatsApp} className="btn-secondary !px-6 !py-3">
              <MessageCircle className="h-4 w-4" />
              Compartilhar no WhatsApp
            </button>
            <button onClick={handleCopy} className="btn-secondary !px-6 !py-3">
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {copied ? 'Link copiado!' : 'Copiar link'}
            </button>
          </div>
        </div>
      </main>

      <div className="relative z-10 flex justify-center px-6 pb-12">
        <AnalystCard profile={analystProfile} compact />
      </div>

      <footer className="relative z-10 pb-8 text-center">
        <div className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          <p>A tecnologia organiza dados.</p>
          <p>A metodologia gera compreensão.</p>
          <p>O especialista conduz a transformação.</p>
        </div>
        <a
          href="/admin/login"
          className="mt-4 inline-block rounded-full border border-ink-muted/30 bg-transparent px-4 py-1.5 text-[10px] text-ink-muted/60 transition hover:border-ink-muted/50 hover:text-ink-muted"
        >
          &#193;rea administrativa
        </a>
      </footer>

      {showMethodology && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={() => setShowMethodology(false)}
        >
          <div
            className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-8 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                  A metodologia
                </div>
                <h2 className="font-display text-2xl font-semibold text-ink">
                  Uma leitura al&#233;m do &#243;bvio
                </h2>
              </div>
              <button
                onClick={() => setShowMethodology(false)}
                className="rounded-full p-2 text-ink-muted transition hover:bg-se-mist hover:text-ink"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-soft">
              <p>
                A <strong className="text-ink">SynaptEssence360&#174;</strong> foi
                concebida para organizar diferentes dimens&#245;es da experi&#234;ncia
                humana em uma leitura estrat&#233;gica de desenvolvimento.
              </p>
              <p>
                O levantamento re&#250;ne informa&#231;&#245;es sobre identidade, rela&#231;&#245;es,
                lideran&#231;a, prop&#243;sito, atua&#231;&#227;o e potencialidades para subsidiar
                uma an&#225;lise personalizada.
              </p>
              <p>O question&#225;rio &#233; apenas o in&#237;cio da jornada.</p>
            </div>

            <div className="mt-6 border-t border-ink/5 pt-5">
              <AnalystCard profile={analystProfile} compact />
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                Um processo de desenvolvimento constru&#237;do a partir da an&#225;lise
                individual do SynaptEssence360&#174;, que transforma autoconhecimento
                em posicionamento, express&#227;o e impacto com ess&#234;ncia.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
