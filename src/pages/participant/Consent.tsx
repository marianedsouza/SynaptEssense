import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldCheck, X } from 'lucide-react'
import { ParticipantLayout } from '../../components/ParticipantLayout'
import { DEFAULT_SETTINGS } from '../../lib/settings'

export function Consent() {
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)

  return (
    <ParticipantLayout>
      <div className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="bg-grad grid h-12 w-12 place-items-center rounded-2xl">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
              Consentimento informado
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink">
              Antes de prosseguir
            </h1>
          </div>
        </div>

        <div className="mt-6 space-y-4 rounded-3xl border border-se-violet/15 bg-se-lavender/40 p-6 text-sm leading-relaxed text-ink-soft md:text-base">
          <p>
            Ao continuar, você declara estar ciente de que as informações
            fornecidas serão utilizadas para fins de levantamento e
            desenvolvimento humano, respeitando os princípios de
            confidencialidade e proteção de dados aplicáveis.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              As respostas serão utilizadas exclusivamente para fins de
              desenvolvimento humano e construção de um plano personalizado.
            </li>
            <li>
              Este levantamento não constitui diagnóstico médico, psicológico ou
              psiquiátrico.
            </li>
            <li>
              A interpretação será realizada exclusivamente por profissional
              habilitado na metodologia SynaptEssence360®.
            </li>
            <li>
              Os dados serão tratados com confidencialidade e armazenados de
              forma segura, em conformidade com a legislação aplicável de
              proteção de dados (como a LGPD).
            </li>
          </ul>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/10 bg-white p-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-se-violet"
          />
          <span className="text-sm text-ink-soft">
            Li e concordo em participar deste levantamento.
          </span>
        </label>

        <button
          onClick={() => setShowPolicy(true)}
          className="mt-3 text-sm font-medium text-se-violet underline decoration-se-violet/30 underline-offset-4 hover:decoration-se-violet"
        >
          Política de Privacidade
        </button>

        <div className="mt-8">
          <button
            onClick={() => navigate('/identificacao')}
            className="btn-primary group"
            disabled={!checked}
          >
            Continuar
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {showPolicy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={() => setShowPolicy(false)}
        >
          <div
            className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-8 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="font-display text-2xl font-semibold text-ink">
                Política de Privacidade
              </h2>
              <button
                onClick={() => setShowPolicy(false)}
                className="rounded-full p-2 text-ink-muted transition hover:bg-se-mist hover:text-ink"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
              <p>
                As informações coletadas por meio do Levantamento Estratégico
                SynaptEssence360® são utilizadas exclusivamente para fins de
                desenvolvimento humano e construção de um plano personalizado.
              </p>
              <p>
                Seus dados são tratados com confidencialidade, armazenados de
                forma segura e não são expostos publicamente.
              </p>
              <p>
                Para solicitar a exclusão de seus dados, entre em contato pelo
                e-mail{' '}
                <a
                  className="text-se-violet underline"
                  href={`mailto:${DEFAULT_SETTINGS.privacy_email}`}
                >
                  {DEFAULT_SETTINGS.privacy_email}
                </a>
                .
              </p>
              <p className="text-xs text-ink-muted">
                Este mapeamento não constitui diagnóstico médico, psicológico ou
                psiquiátrico.
              </p>
            </div>
          </div>
        </div>
      )}
    </ParticipantLayout>
  )
}
