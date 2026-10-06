import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  GripHorizontal,
  MessageCircle,
  Pencil,
  Plus,
  QrCode,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { QrModal } from '../../components/admin/QrModal'
import { supabase } from '../../lib/supabase'
import {
  campaignUrl,
  createCampaign,
  deleteCampaign,
  fetchCampaigns,
  slugify,
  updateCampaign,
  type Campaign,
} from '../../lib/campaigns'

interface TrackingEvent {
  id: string
  visitor_id: string
  event: string
  ref: string | null
  created_at: string
}

interface RefStats {
  unique: number
  visits: number
  diagStart: number
  emails: number
  results: number
  paymentClicks: number
}

const PATH_OPTIONS = [
  { value: '/', label: 'Página Inicial' },
  { value: '/protocolo', label: 'Protocolo de Resgate de Identidade' },
  { value: '/pagamento-combinado', label: 'Pagamento combinado' },
  { value: '/minha-area', label: 'Minha Área' },
]

const SHARE_MESSAGE =
  'SynaptEssence360® — Plataforma de Tecnologia Social para o Desenvolvimento Humano Integral. Toda transformação começa quando novas conexões são criadas.'

function fmtInt(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n)
}

interface FormState {
  name: string
  slug: string
  path: string
  description: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  path: '/protocolo',
  description: '',
  active: true,
}

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null) // null = form fechado
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [qr, setQr] = useState<Campaign | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [camps, res] = await Promise.all([
          fetchCampaigns(),
          supabase
            .from('tracking_events')
            .select('id,visitor_id,event,ref,created_at')
            .gte(
              'created_at',
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            )
            .order('created_at', { ascending: true })
            .limit(5000),
        ])
        if (cancelled) return
        setCampaigns(camps)
        if (res.error) {
          setError(
            'Não foi possível carregar os dados de rastreamento das campanhas.',
          )
        } else {
          setEvents((res.data as TrackingEvent[]) ?? [])
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Métricas por origem (?ref=) nos últimos 30 dias
  const statsByRef = useMemo(() => {
    const map = new Map<string, RefStats>()
    for (const e of events) {
      const key = e.ref ?? ''
      let row = map.get(key)
      if (!row) {
        row = { unique: 0, visits: 0, diagStart: 0, emails: 0, results: 0, paymentClicks: 0 }
        map.set(key, row)
      }
      if (e.event === 'page_view') row.visits++
      else if (e.event === 'diagnostic_start' || e.event === 'diagnostic_resume') row.diagStart++
      else if (e.event === 'email_capture') row.emails++
      else if (e.event === 'diagnostic_result') row.results++
      else if (e.event === 'payment_click') row.paymentClicks++
    }
    const uniqueByRef = new Map<string, Set<string>>()
    for (const e of events) {
      if (e.event !== 'page_view') continue
      const key = e.ref ?? ''
      const set = uniqueByRef.get(key) ?? new Set<string>()
      set.add(e.visitor_id)
      uniqueByRef.set(key, set)
    }
    for (const [key, set] of uniqueByRef) {
      const row = map.get(key)
      if (row) row.unique = set.size
    }
    return map
  }, [events])

  async function copyUrl(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedId(id)
    window.setTimeout(() => setCopiedId(null), 2500)
  }

  function shareWhatsApp(url: string) {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${SHARE_MESSAGE} ${url}`)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSlugTouched(false)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      slug: c.slug,
      path: c.path,
      description: c.description ?? '',
      active: c.active,
    })
    setSlugTouched(true)
    setFormError(null)
    setFormOpen(true)
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // O slug segue o nome até ser editado manualmente
      if (key === 'name' && !slugTouched) next.slug = slugify(String(value))
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const slug = form.slug.trim().toLowerCase()
    if (!form.name.trim()) {
      setFormError('Informe um nome para a campanha.')
      return
    }
    if (!slug) {
      setFormError('Informe um slug (identificador) para a campanha.')
      return
    }
    if (form.slug !== slug) {
      setForm((prev) => ({ ...prev, slug }))
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        await updateCampaign(editingId, {
          name: form.name.trim(),
          slug,
          path: form.path,
          description: form.description.trim() || null,
          active: form.active,
        })
      } else {
        await createCampaign({
          name: form.name.trim(),
          slug,
          path: form.path,
          description: form.description.trim() || null,
        })
      }
      setCampaigns(await fetchCampaigns())
      setFormOpen(false)
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c: Campaign) {
    try {
      await updateCampaign(c.id, { active: !c.active })
      setCampaigns(await fetchCampaigns())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleDelete(c: Campaign) {
    if (!window.confirm(`Excluir a campanha "${c.name}". Os dados de rastreamento são mantidos.`)) {
      return
    }
    try {
      await deleteCampaign(c.id)
      setCampaigns(await fetchCampaigns())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-8">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-se-violet md:text-[11px]">
            SynaptEssence360®
          </div>
          <h1 className="mt-0.5 font-display text-2xl font-semibold text-ink md:text-3xl">
            Campanhas
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Crie links rastreáveis para cada divulgação. Cada campanha ganha um{' '}
            <code className="rounded bg-ink/5 px-1">?ref=</code> próprio e um QR Code —
            visitas e conversões aparecem aqui e no painel Tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova campanha
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-52 animate-pulse bg-se-mist/60" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-se-lavender">
            <GripHorizontal className="h-5 w-5 text-se-violet" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">
            Nenhuma campanha ainda
          </h3>
          <p className="max-w-sm text-sm text-ink-muted">
            Crie a primeira campanha para gerar um link rastreável e o QR Code da
            divulgação.
          </p>
          <button type="button" onClick={openNew} className="btn-primary mt-2 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Criar campanha
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => {
            const url = campaignUrl(c)
            const stats = statsByRef.get(c.slug)
            const isCopied = copiedId === c.id
            return (
              <div
                key={c.id}
                className={`card relative p-6 transition-all ${
                  c.active ? 'border border-ink/5' : 'border border-dashed border-ink/15'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink">
                      {c.name}
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      {c.description || 'Sem descrição'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          c.active
                            ? 'bg-se-teal/10 text-se-teal-dark'
                            : 'bg-ink/5 text-ink-muted'
                        }`}
                      >
                        {c.active ? 'Ativa' : 'Pausada'}
                      </span>
                      <span className="rounded-full bg-se-lavender px-2 py-0.5 text-[10px] font-medium text-se-violet">
                        {PATH_OPTIONS.find((p) => p.value === c.path)?.label ?? c.path}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQr(c)}
                      className="rounded-full p-2 text-ink-muted transition hover:bg-se-mist hover:text-ink"
                      aria-label="Ver QR Code"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full p-2 text-ink-muted transition hover:bg-se-mist hover:text-ink"
                      aria-label="Abrir link da campanha"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="rounded-full p-2 text-ink-muted transition hover:bg-se-mist hover:text-ink"
                      aria-label="Editar campanha"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="rounded-full p-2 text-ink-muted transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Excluir campanha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink/10 bg-se-mist/50 px-3 py-2">
                  <GripHorizontal className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{url}</span>
                </div>

                {/* Métricas nos últimos 30 dias */}
                <div className="mt-4 grid grid-cols-5 gap-2 rounded-xl border border-ink/5 bg-se-mist/30 p-3 text-center">
                  {[
                    { label: 'Visitas', value: stats?.visits ?? 0 },
                    { label: 'Únicos', value: stats?.unique ?? 0 },
                    { label: 'Diagnóstico', value: stats?.diagStart ?? 0 },
                    { label: 'E-mails', value: stats?.emails ?? 0 },
                    { label: 'Clique pago', value: stats?.paymentClicks ?? 0 },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="font-display text-base font-semibold text-ink">
                        {fmtInt(m.value)}
                      </div>
                      <div className="text-[9px] uppercase tracking-wide text-ink-muted">
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => copyUrl(url, c.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                      isCopied
                        ? 'border border-green-200 bg-green-50 text-green-700'
                        : 'border border-ink/10 bg-white text-ink-soft hover:border-se-violet/30 hover:text-ink'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar link
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => shareWhatsApp(url)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-ink-muted">
                    {stats ? (
                      <>
                        <strong className="text-ink">{fmtInt(stats.results)}</strong> concluíram o diagnóstico
                      </>
                    ) : (
                      'Sem dados no período'
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2">
                    <span className="text-[11px] font-medium text-ink-muted">
                      {c.active ? 'Ativa' : 'Pausada'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={c.active}
                      onClick={() => toggleActive(c)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                        c.active ? 'bg-se-teal' : 'bg-ink/20'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          c.active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && campaigns.length > 0 && (
        <div className="mt-6 flex items-center gap-2 text-xs text-ink-muted">
          <Users className="h-3.5 w-3.5" />
          Métricas dos últimos 30 dias de eventos rastreados.
        </div>
      )}

      {/* ─── FORM (criar/editar) ─── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <form onSubmit={handleSubmit} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 animate-fade-up">
            <div className="mb-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-se-violet">
                {editingId ? 'Editar campanha' : 'Nova campanha'}
              </div>
              <h3 className="mt-0.5 font-display text-xl font-semibold text-ink">
                {editingId ? 'Ajuste os dados da campanha' : 'Defina a campanha'}
              </h3>
            </div>

            <div className="mb-4">
              <label className="label" htmlFor="campaign-name">Nome da campanha</label>
              <input
                id="campaign-name"
                type="text"
                className="input"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ex.: Instagram — janeiro"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="label" htmlFor="campaign-slug">Identificador (ref)</label>
              <input
                id="campaign-slug"
                type="text"
                className="input font-mono"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  updateField('slug', slugify(e.target.value))
                }}
                placeholder="ex.: instagram-janeiro"
              />
              <p className="mt-1 text-[11px] text-ink-muted">
                Vira o <code className="rounded bg-ink/5 px-1">?ref=</code> no link. Segue o
                nome, mas pode ser ajustado.
              </p>
            </div>

            <div className="mb-4">
              <label className="label" htmlFor="campaign-path">Página de destino</label>
              <select
                id="campaign-path"
                className="input"
                value={form.path}
                onChange={(e) => updateField('path', e.target.value)}
              >
                {PATH_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="label" htmlFor="campaign-description">Descrição (opcional)</label>
              <textarea
                id="campaign-description"
                className="input min-h-[80px]"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Para que serve esta campanha?"
              />
            </div>

            {editingId && (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-ink/5 bg-se-mist/30 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {form.active ? 'Campanha ativa' : 'Campanha pausada'}
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    Pausar mantém o link, mas interrompe a divulgação para novos envios.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.active}
                  onClick={() => updateField('active', !form.active)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                    form.active ? 'bg-se-teal' : 'bg-ink/20'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      form.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}

            {formError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar campanha'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── QR CODE ─── */}
      {qr && (
        <QrModal
          url={campaignUrl(qr)}
          title={qr.name}
          fileName={`qr-${qr.slug}.png`}
          onClose={() => setQr(null)}
        />
      )}
    </AdminLayout>
  )
}