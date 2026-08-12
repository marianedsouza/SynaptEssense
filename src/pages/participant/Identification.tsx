import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ParticipantLayout } from '../../components/ParticipantLayout'
import { createParticipant, setSessionId } from '../../lib/participants'
import type { IdentificationData } from '../../lib/types'

const EXPERIENCE_OPTIONS = [
  'Menos de 1 ano',
  '1 a 3 anos',
  '4 a 7 anos',
  '8 a 15 anos',
  'Mais de 15 anos',
]

const SURVEY_OPTIONS = [
  'Para mim',
  'Para minha atuação profissional',
  'Para minha marca pessoal',
  'Para uma empresa',
  'Para uma organização',
  'Para outro projeto',
]

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
]

const EMPTY: IdentificationData = {
  fullName: '',
  email: '',
  city: '',
  state: '',
  birthDate: '',
  age: '',
  field: '',
  experienceTime: '',
  organization: '',
  surveyFor: '',
}

export function Identification() {
  const navigate = useNavigate()
  const [data, setData] = useState<IdentificationData>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof IdentificationData, value: string) =>
    setData((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!data.fullName.trim()) {
      setError('Precisamos do seu nome para continuar.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      setError('Precisamos de um e-mail válido para entrarmos em contato.')
      return
    }
    if (!data.surveyFor) {
      setError('Escolha uma opção para avançarmos.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const participant = await createParticipant(data, true)
      setSessionId(participant.id)
      navigate('/levantamento')
    } catch {
      setError(
        'Não foi possível iniciar o levantamento neste momento. Tente novamente.',
      )
      setSaving(false)
    }
  }

  return (
    <ParticipantLayout>
      <div className="animate-fade-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
          Primeiro passo
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink">
          Vamos começar por você.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Estas informações nos ajudarão a contextualizar sua análise. Preencha
          com calma — suas respostas ficam salvas.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="fullName">
              Nome completo <span className="text-se-violet">*</span>
            </label>
            <input
              id="fullName"
              className="input"
              value={data.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="email">
              E-mail <span className="text-se-violet">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={data.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="melhor@email.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="city">
              Cidade
            </label>
            <input
              id="city"
              className="input"
              value={data.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Sua cidade"
            />
          </div>

          <div>
            <label className="label" htmlFor="state">
              Estado
            </label>
            <select
              id="state"
              className="input"
              value={data.state}
              onChange={(e) => set('state', e.target.value)}
            >
              <option value="">Selecione</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="birthDate">
              Data de nascimento
            </label>
            <input
              id="birthDate"
              type="date"
              className="input"
              value={data.birthDate}
              onChange={(e) => set('birthDate', e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="age">
              Idade
            </label>
            <input
              id="age"
              type="number"
              min={0}
              max={120}
              className="input"
              value={data.age}
              onChange={(e) => set('age', e.target.value)}
              placeholder="Ex.: 32"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="field">
              Área de atuação
            </label>
            <input
              id="field"
              className="input"
              value={data.field}
              onChange={(e) => set('field', e.target.value)}
              placeholder="Ex.: comunicação, política, gestão…"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="experienceTime">
              Há quanto tempo você atua profissionalmente ou desenvolve sua
              atividade atual?
            </label>
            <select
              id="experienceTime"
              className="input"
              value={data.experienceTime}
              onChange={(e) => set('experienceTime', e.target.value)}
            >
              <option value="">Selecione</option>
              {EXPERIENCE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="organization">
              Empresa, marca ou organização, quando aplicável
            </label>
            <input
              id="organization"
              className="input"
              value={data.organization}
              onChange={(e) => set('organization', e.target.value)}
              placeholder="Nome da empresa, marca ou organização"
            />
          </div>

          <div className="sm:col-span-2">
            <span className="label">
              Este levantamento será realizado: <span className="text-se-violet">*</span>
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              {SURVEY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => set('surveyFor', option)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200 ${
                    data.surveyFor === option
                      ? 'border-se-violet bg-se-lavender text-se-violet-dark shadow-soft'
                      : 'border-ink/10 bg-white text-ink-soft hover:border-se-violet/40'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={handleSubmit}
            className="btn-primary group"
            disabled={saving}
          >
            {saving ? 'Preparando…' : 'Começar mapeamento'}
            {!saving && (
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            )}
          </button>
        </div>
      </div>
    </ParticipantLayout>
  )
}
