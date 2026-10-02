import { useCallback, useEffect, useState } from 'react'
import { ImagePlus, Save, CreditCard } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { fetchSettings, saveSetting } from '../../lib/settings'
import { supabase } from '../../lib/supabase'

const FIELDS_ANALYST1: { key: string; label: string; textarea?: boolean }[] = [
  { key: 'analyst_name', label: 'Nome' },
  { key: 'analyst_title', label: 'Título profissional' },
  { key: 'analyst_bio', label: 'Apresentação breve', textarea: true },
]

const FIELDS_ANALYST2: { key: string; label: string; textarea?: boolean }[] = [
  { key: 'analyst2_name', label: 'Nome' },
  { key: 'analyst2_title', label: 'Título profissional' },
  { key: 'analyst2_bio', label: 'Apresentação breve', textarea: true },
]

const FIELDS_GENERAL: { key: string; label: string; textarea?: boolean }[] = [
  { key: 'hero_message', label: 'Mensagem central da tela inicial' },
  { key: 'closing_message', label: 'Mensagem de encerramento' },
  { key: 'institutional_text', label: 'Texto institucional da metodologia', textarea: true },
  { key: 'privacy_email', label: 'E-mail para solicitação de exclusão (LGPD)' },
]

const FIELDS_PAYMENT_SOCIAL: { key: string; label: string; description: string }[] = [
  { key: 'payment_social_complete', label: 'Valor da jornada completa (R$)', description: 'Investimento único do Protocolo Essencial — processo completo de 90 dias. Parcelável via Mercado Pago.' },
]

const FIELDS_PAYMENT_INTEGRAL: { key: string; label: string; description: string }[] = [
  { key: 'payment_integral_complete', label: 'Valor da jornada completa (R$)', description: 'Investimento único da Mentoria Integral — processo completo de 90 dias. Parcelável via Mercado Pago.' },
]

export function Settings() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading2, setUploading2] = useState(false)
  const [photoUrl2, setPhotoUrl2] = useState('')
  const [uploadError2, setUploadError2] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings().then((settings) => {
      setValues(settings)
      setPhotoUrl(settings.analyst_photo ?? '')
      setPhotoUrl2(settings.analyst2_photo ?? '')
      setLoading(false)
    })
  }, [])

  const set = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaveError(null)
    const results = []
    for (const field of FIELDS_ANALYST1) {
      results.push(await saveSetting(field.key, values[field.key] ?? ''))
    }
    for (const field of FIELDS_ANALYST2) {
      results.push(await saveSetting(field.key, values[field.key] ?? ''))
    }
    for (const field of FIELDS_GENERAL) {
      results.push(await saveSetting(field.key, values[field.key] ?? ''))
    }
    for (const field of FIELDS_PAYMENT_SOCIAL) {
      results.push(await saveSetting(field.key, values[field.key] ?? ''))
    }
    for (const field of FIELDS_PAYMENT_INTEGRAL) {
      results.push(await saveSetting(field.key, values[field.key] ?? ''))
    }
    results.push(await saveSetting('analyst_photo', photoUrl))
    results.push(await saveSetting('analyst2_photo', photoUrl2))
    results.push(await saveSetting('combined_payment_enabled', values.combined_payment_enabled ?? 'true'))
    const failed = results.find((r) => !r.ok)
    if (failed) {
      setSaveError(`Não foi possível salvar: ${failed.error}`)
      return
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return
      setUploading(true)
      setUploadError(null)
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `analyst/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('assets')
        .upload(path, file, { upsert: false })
      if (error) {
        setUploadError(
          'Não foi possível enviar a imagem. Verifique se o bucket "assets" existe e a política de upload.',
        )
        setUploading(false)
        return
      }
      const { data } = supabase.storage.from('assets').getPublicUrl(path)
      setPhotoUrl(data.publicUrl)
      setUploading(false)
    },
    [],
  )

  const handleUpload2 = useCallback(
    async (file: File) => {
      if (!file) return
      setUploading2(true)
      setUploadError2(null)
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `analyst2/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('assets')
        .upload(path, file, { upsert: false })
      if (error) {
        setUploadError2(
          'Não foi possível enviar a imagem. Verifique se o bucket "assets" existe e a política de upload.',
        )
        setUploading2(false)
        return
      }
      const { data } = supabase.storage.from('assets').getPublicUrl(path)
      setPhotoUrl2(data.publicUrl)
      setUploading2(false)
    },
    [],
  )

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
            Personalização
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">
            Configurações
          </h1>
        </div>
        <button onClick={handleSave} className="btn-primary !px-6 !py-3">
          {saved ? (
            <>
              <Save className="h-4 w-4" />
              Salvo
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar
            </>
          )}
        </button>
      </div>

      {saveError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="card p-5 md:p-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          Equipe de analistas
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Perfis que transmitem autoridade e confiança na experiência do participante.
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* Analista 1 */}
          <div>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-se-violet">
              Analista principal
            </div>
            <div className="flex flex-col items-center gap-3">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Foto da analista"
                  className="h-32 w-32 rounded-3xl object-cover ring-2 ring-se-violet/20"
                />
              ) : (
                <div className="bg-grad grid h-32 w-32 place-items-center rounded-3xl">
                  <ImagePlus className="h-9 w-9 text-white/80" />
                </div>
              )}
              <label className="btn-secondary !px-4 !py-2 text-xs cursor-pointer">
                {uploading ? 'Enviando…' : 'Enviar foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(file)
                  }}
                />
              </label>
              {photoUrl && (
                <button
                  onClick={() => setPhotoUrl('')}
                  className="text-xs text-ink-muted underline hover:text-red-600"
                >
                  Remover foto
                </button>
              )}
              {uploadError && (
                <p className="text-center text-xs text-red-600">{uploadError}</p>
              )}
            </div>
            <div className="mt-4 space-y-4">
              {FIELDS_ANALYST1.map((field) => (
                <div key={field.key}>
                  <label className="label" htmlFor={`setting-${field.key}`}>
                    {field.label}
                  </label>
                  {field.textarea ? (
                    <textarea
                      id={`setting-${field.key}`}
                      rows={3}
                      className="input resize-y"
                      value={values[field.key] ?? ''}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  ) : (
                    <input
                      id={`setting-${field.key}`}
                      className="input"
                      value={values[field.key] ?? ''}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Analista 2 */}
          <div>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-se-violet">
              Segunda analista
            </div>
            <div className="flex flex-col items-center gap-3">
              {photoUrl2 ? (
                <img
                  src={photoUrl2}
                  alt="Foto da segunda analista"
                  className="h-32 w-32 rounded-3xl object-cover ring-2 ring-se-violet/20"
                />
              ) : (
                <div className="bg-grad grid h-32 w-32 place-items-center rounded-3xl">
                  <ImagePlus className="h-9 w-9 text-white/80" />
                </div>
              )}
              <label className="btn-secondary !px-4 !py-2 text-xs cursor-pointer">
                {uploading2 ? 'Enviando…' : 'Enviar foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload2(file)
                  }}
                />
              </label>
              {photoUrl2 && (
                <button
                  onClick={() => setPhotoUrl2('')}
                  className="text-xs text-ink-muted underline hover:text-red-600"
                >
                  Remover foto
                </button>
              )}
              {uploadError2 && (
                <p className="text-center text-xs text-red-600">{uploadError2}</p>
              )}
            </div>
            <div className="mt-4 space-y-4">
              {FIELDS_ANALYST2.map((field) => (
                <div key={field.key}>
                  <label className="label" htmlFor={`setting-${field.key}`}>
                    {field.label}
                  </label>
                  {field.textarea ? (
                    <textarea
                      id={`setting-${field.key}`}
                      rows={3}
                      className="input resize-y"
                      value={values[field.key] ?? ''}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  ) : (
                    <input
                      id={`setting-${field.key}`}
                      className="input"
                      value={values[field.key] ?? ''}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Campos gerais */}
      <div className="card mt-6 p-5 md:p-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          Configurações gerais
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Textos e mensagens exibidos na plataforma para ambas as analistas.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {FIELDS_GENERAL.map((field) => (
            <div
              key={field.key}
              className={field.textarea ? 'sm:col-span-2' : ''}
            >
              <label className="label" htmlFor={`setting-${field.key}`}>
                {field.label}
              </label>
              {field.textarea ? (
                <textarea
                  id={`setting-${field.key}`}
                  rows={3}
                  className="input resize-y"
                  value={values[field.key] ?? ''}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              ) : (
                <input
                  id={`setting-${field.key}`}
                  className="input"
                  value={values[field.key] ?? ''}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs uppercase tracking-[0.2em] text-ink-muted">
          Toda transformação começa quando novas conexões são criadas.
        </p>
      </div>

      {/* Configurações de pagamento */}
      <div className="card mt-6 p-5 md:p-8">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-se-violet" />
          <h2 className="font-display text-xl font-semibold text-ink">
            Pagamento
          </h2>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Valores cobrados ao participante segundo as regras do protocolo escolhido.
          O pagamento é processado via Mercado Pago.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink/5 p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-se-teal" />
              <h3 className="font-display text-lg font-semibold text-ink">Modalidade Protocolo Essencial</h3>
            </div>
            <div className="space-y-4">
              {FIELDS_PAYMENT_SOCIAL.map((field) => (
                <div key={field.key}>
                  <label className="label" htmlFor={`setting-${field.key}`}>
                    {field.label}
                  </label>
                  <input
                    id={`setting-${field.key}`}
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={values[field.key] ?? ''}
                    onChange={(e) => set(field.key, e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-ink-muted">{field.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ink/5 p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-se-violet" />
              <h3 className="font-display text-lg font-semibold text-ink">Mentoria Integral</h3>
            </div>
            <div className="space-y-4">
              {FIELDS_PAYMENT_INTEGRAL.map((field) => (
                <div key={field.key}>
                  <label className="label" htmlFor={`setting-${field.key}`}>
                    {field.label}
                  </label>
                  <input
                    id={`setting-${field.key}`}
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={values[field.key] ?? ''}
                    onChange={(e) => set(field.key, e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-ink-muted">{field.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-se-lavender bg-se-lavender/30 px-4 py-3 text-xs text-ink-soft">
          <strong className="text-ink">Nota:</strong> O participante paga o valor total da jornada
          de uma vez via Mercado Pago, com parcelamento.
          A public key do Mercado Pago é configurada na variável de ambiente <code className="rounded bg-ink/5 px-1">VITE_MERCADOPAGO_PUBLIC_KEY</code>.
        </div>
      </div>

      {/* Controle do link de pagamento combinado */}
      <div className="card mt-6 p-5 md:p-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          Link de pagamento combinado
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Controle se o link de acesso com pagamento combinado (sem Mercado Pago) está liberado.
          Quando desligado, o link exibe uma mensagem de indisponível.
        </p>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-ink/5 bg-se-mist/40 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-ink">
              {values.combined_payment_enabled !== 'false' ? 'Acesso liberado' : 'Acesso bloqueado'}
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              {values.combined_payment_enabled !== 'false'
                ? 'Novos pacientes podem criar o ambiente pelo link de pagamento combinado.'
                : 'O link está desativado — ninguém consegue criar ambiente por ele.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={values.combined_payment_enabled !== 'false'}
            onClick={() =>
              set('combined_payment_enabled', values.combined_payment_enabled !== 'false' ? 'false' : 'true')
            }
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              values.combined_payment_enabled !== 'false' ? 'bg-se-teal' : 'bg-ink/20'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                values.combined_payment_enabled !== 'false' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Lembre-se de clicar em <strong className="text-ink">Salvar</strong> no topo para aplicar a alteração.
        </p>
      </div>
    </AdminLayout>
  )
}
