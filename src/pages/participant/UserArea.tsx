import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, Check, Clock, CreditCard, LogOut, RefreshCw, Shield, X, User, Pencil } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NeuralBackground } from '../../components/NeuralBackground'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../context/SettingsContext'
import { MODALITY_LABELS, PROTOCOL_TOTAL_SESSIONS, planDurationMonths, planQualityLabel } from '../../lib/protocol'
import { fetchSessionsByLead, type SessionRecord } from '../../lib/sessions'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface Lead {
  id: string
  name: string
  phone: string
  email: string
  plan: 'mensal' | 'completo'
  modality: 'social' | 'integral'
  created_at: string
}

interface PayRecord {
  id: string
  modality: 'social' | 'integral'
  plan: 'mensal' | 'completo'
  amount: number
  status: string
  mp_payment_id: string | null
  created_at: string
}

function fmtCurrency(value: number) {
  if (!value || value <= 0) return 'R$ 0,00'
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function UserArea() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { settings } = useSettings()

  const [user, setUser] = useState<{ email: string } | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [payments, setPayments] = useState<PayRecord[]>([])
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [switchOpen, setSwitchOpen] = useState(false)
  const [switchModality, setSwitchModality] = useState<'social' | 'integral'>('social')
  const [switchPlan, setSwitchPlan] = useState<'mensal' | 'completo'>('completo')
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [savingSwitch, setSavingSwitch] = useState(false)

  const statusParam = searchParams.get('status')

  const load = useCallback(async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    if (!u) {
      navigate('/minha-area/login', { replace: true })
      return
    }
    setUser({ email: u.email ?? '' })

    const email = (u.email ?? '').toLowerCase()
    const [leadsRes, paysRes] = await Promise.all([
      supabase
        .from('protocol_leads')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('*')
        .eq('payer_email', email)
        .order('created_at', { ascending: false }),
    ])

    setLeads((leadsRes.data ?? []) as Lead[])
    setPayments((paysRes.data ?? []) as PayRecord[])
    const firstLead = (leadsRes.data?.[0] as Lead | undefined)
    if (firstLead) {
      setSessions(await fetchSessionsByLead(firstLead.id))
    }
    setLoading(false)
  }, [navigate])

  useEffect(() => {
    load()
  }, [load])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  async function handleCreatePayment(plan?: 'mensal' | 'completo') {
    if (!lastLead) return
    const targetPlan = plan ?? lastLead.plan
    setPaying(true)
    setPayError(null)

    const amount =
      lastLead.modality === 'social'
        ? parseFloat(targetPlan === 'mensal' ? settings.payment_social_monthly : settings.payment_social_complete) || 0
        : parseFloat(targetPlan === 'mensal' ? settings.payment_integral_monthly : settings.payment_integral_complete) || 0

    try {
      if (!amount || amount <= 0) {
        throw new Error('Valor do plano não configurado. Informe os valores no painel do analista.')
      }

      const email = (user?.email ?? '').toLowerCase()
      const response = await fetch(`${supabaseUrl}/functions/v1/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
          'x-site-url': window.location.origin,
        },
        body: JSON.stringify({
          modalidade: lastLead.modality,
          plan: targetPlan,
          amount,
          name: lastLead.name,
          email,
          phone: lastLead.phone,
          lead_id: lastLead.id,
          user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        }),
      })

      let result: Record<string, unknown>
      try {
        result = await response.json()
      } catch {
        throw new Error(
          'Resposta inesperada do servidor (código ' + response.status + '). Confirme que a Edge Function create-preference está publicada.',
        )
      }

      if (!response.ok) {
        const errMsg = typeof result.error === 'string' ? result.error : 'Erro ao criar o pagamento.'
        throw new Error(errMsg)
      }

      const initPoint =
        (typeof result.init_point === 'string' && result.init_point) ||
        (typeof result.sandbox_init_point === 'string' && result.sandbox_init_point)
      if (!initPoint) {
        throw new Error('Não foi possível obter o link de pagamento do Mercado Pago.')
      }

      window.location.href = initPoint
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Erro ao iniciar o pagamento.')
      setPaying(false)
    }
  }

  async function handleSwitchProtocol() {
    if (!lastLead) return
    setSavingSwitch(true)
    setSwitchError(null)
    const { error } = await supabase
      .from('protocol_leads')
      .update({ modality: switchModality, plan: switchPlan, updated_at: new Date().toISOString() })
      .eq('id', lastLead.id)
    if (error) {
      setSwitchError(error.message)
      setSavingSwitch(false)
      return
    }
    setSwitchOpen(false)
    setSavingSwitch(false)
    await load()
  }

  const lastLead = leads[0]
  const isPaid = payments.some((p) => p.status === 'approved')
  const hasPending = payments.some((p) => p.status === 'pending')

  const approvedPayments = payments.filter((p) => p.status === 'approved')
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)

  const displayPayments = approvedPayments.length
    ? approvedPayments
    : payments.filter((p) => p.status === 'pending').slice(0, 1)

  const realized = sessions.filter((s) => s.status === 'realizada').length
  const remaining = Math.max(PROTOCOL_TOTAL_SESSIONS - realized, 0)
  const planMonths = lastLead ? planDurationMonths(lastLead.plan) : 0

  const protocolStart = lastLead ? new Date(lastLead.created_at).getTime() : 0
  const protocolEnd = protocolStart ? new Date(protocolStart + planMonths * 30 * 24 * 60 * 60 * 1000) : null
  const periodEnded = protocolEnd ? new Date() > protocolEnd : false
  const finished = isPaid && (remaining <= 0 || periodEnded)

  const pricePerSession = lastLead
    ? lastLead.modality === 'social'
      ? settings.payment_social_value_per_session
      : settings.payment_integral_value_per_session
    : ''
  const priceMonthly = lastLead
    ? lastLead.modality === 'social'
      ? settings.payment_social_monthly
      : settings.payment_integral_monthly
    : ''
  const priceComplete = lastLead
    ? lastLead.modality === 'social'
      ? settings.payment_social_complete
      : settings.payment_integral_complete
    : ''

  if (loading) {
    return (
      <div className="relative min-h-screen bg-se-mist">
        <NeuralBackground className="opacity-20 fixed inset-0" />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-se-mist">
      <NeuralBackground className="opacity-20 fixed inset-0" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <button onClick={() => navigate('/')} className="transition hover:opacity-70">
          <Logo size="md" />
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-xs text-ink-soft sm:inline-flex">
            <User className="h-3.5 w-3.5" />
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs font-medium text-ink-soft backdrop-blur transition hover:border-red-300 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-8">
        {/* Payment status banner */}
        {statusParam === 'approved' && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-se-teal/30 bg-se-teal/10 px-5 py-4">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-se-teal" />
            <div>
              <div className="text-sm font-semibold text-ink">Pagamento realizado com sucesso!</div>
              <p className="mt-1 text-sm text-ink-soft">
                Seu acesso foi criado. Em breve entraremos em contato pelo número informado para alinhar os próximos passos do seu protocolo.
              </p>
            </div>
          </div>
        )}
        {statusParam === 'pending' && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <div className="text-sm font-semibold text-ink">Pagamento pendente</div>
              <p className="mt-1 text-sm text-ink-soft">
                Assim que o pagamento for confirmado, atualizaremos seu status.
              </p>
            </div>
          </div>
        )}
        {statusParam === 'failure' && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <X className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <div className="text-sm font-semibold text-ink">Pagamento não concluído</div>
              <p className="mt-1 text-sm text-ink-soft">
                Você pode tentar novamente na página do protocolo.
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
            Área do participante
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">
            Meu protocolo
          </h1>
        </div>

        {leads.length > 0 && (
          <div className="card mb-6 border-2 border-se-violet/15 p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-se-teal/10 px-3 py-1 text-xs font-semibold text-se-teal">
                    <Check className="h-3.5 w-3.5" /> Pago
                  </span>
                ) : hasPending ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                    <Clock className="h-3.5 w-3.5" /> Pendente
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-se-lavender px-3 py-1 text-xs font-semibold text-se-violet">
                    <CreditCard className="h-3.5 w-3.5" /> Aguardando pagamento
                  </span>
                )}
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {planQualityLabel(lastLead.plan)} • {MODALITY_LABELS[lastLead.modality]}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {!isPaid
                      ? 'Conclua o pagamento para ativar seu protocolo'
                      : finished
                        ? 'Protocolo concluído — renove para continuar'
                        : 'Protocolo em andamento'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                {isPaid && finished && (
                  <button
                    onClick={() => handleCreatePayment(lastLead.plan)}
                    disabled={paying}
                    className="btn-primary !px-6"
                  >
                    {paying ? 'Abrindo pagamento…' : 'Renovar assinatura'}
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                {isPaid && !finished && (
                  <span className="rounded-xl border border-se-teal/30 bg-se-teal/10 px-4 py-2 text-xs font-medium text-se-teal">
                    Em andamento • {remaining} sessão{remaining === 1 ? '' : 's'} restante{remaining === 1 ? '' : 's'}
                  </span>
                )}
                {!isPaid && (
                  <>
                    <button
                      onClick={() => handleCreatePayment(lastLead.plan)}
                      disabled={paying}
                      className="btn-primary !px-6"
                    >
                      {paying ? 'Abrindo pagamento…' : 'Fazer pagamento'}
                      <CreditCard className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSwitchOpen((v) => !v)}
                      disabled={paying}
                      className="btn-secondary !px-6"
                    >
                      <Pencil className="h-4 w-4" />
                      Trocar protocolo
                    </button>
                  </>
                )}
                {payError && (
                  <p className="text-right text-xs text-red-600">{payError}</p>
                )}
              </div>
            </div>

            {switchOpen && !isPaid && (
              <div className="mt-5 rounded-2xl border border-se-violet/20 bg-se-lavender/20 p-5">
                <div className="mb-3 text-sm font-semibold text-ink">Trocar de protocolo antes de pagar</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Modalidade</label>
                    <select
                      className="input"
                      value={switchModality}
                      onChange={(e) => setSwitchModality(e.target.value as 'social' | 'integral')}
                    >
                      <option value="social">Modalidade Social</option>
                      <option value="integral">Protocolo Integral de Reconstrução</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Plano</label>
                    <select
                      className="input"
                      value={switchPlan}
                      onChange={(e) => setSwitchPlan(e.target.value as 'mensal' | 'completo')}
                    >
                      <option value="mensal">Plano mensal</option>
                      <option value="completo">Plano completo</option>
                    </select>
                  </div>
                </div>
                {switchError && <p className="mt-2 text-xs text-red-600">{switchError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={handleSwitchProtocol} disabled={savingSwitch} className="btn-primary">
                    {savingSwitch ? 'Salvando…' : 'Salvar nova escolha'}
                  </button>
                  <button onClick={() => setSwitchOpen(false)} className="btn-secondary">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {leads.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-se-lavender">
              <Shield className="h-7 w-7 text-se-violet" />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold text-ink">Nenhum protocolo ainda</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Você ainda não adquiriu um protocolo. Conheça as modalidades disponíveis.
            </p>
            <button onClick={() => navigate('/protocolo')} className="btn-primary mt-6">
              Conhecer o protocolo
            </button>
          </div>
        ) : (
          <>
            {/* Protocol summary card */}
            <div className="card p-6 md:p-8">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-se-violet" />
                <h2 className="font-display text-lg font-semibold text-ink">Informações do protocolo</h2>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-ink/5 bg-se-mist/60 p-4">
                  <div className="text-xs text-ink-muted">Modalidade</div>
                  <div className="mt-1 font-display text-base font-semibold text-ink">
                    {MODALITY_LABELS[lastLead.modality]}
                  </div>
                </div>
                <div className="rounded-2xl border border-ink/5 bg-se-mist/60 p-4">
                  <div className="text-xs text-ink-muted">Plano contratado</div>
                  <div className="mt-1 font-display text-base font-semibold capitalize text-ink">
                    {planQualityLabel(lastLead.plan)}
                  </div>
                </div>
                <div className="rounded-2xl border border-ink/5 bg-se-mist/60 p-4">
                  <div className="text-xs text-ink-muted">Início do protocolo</div>
                  <div className="mt-1 font-display text-base font-semibold text-ink">
                    {fmtDate(lastLead.created_at)}
                  </div>
                </div>
                <div className="rounded-2xl border border-ink/5 bg-se-mist/60 p-4">
                  <div className="text-xs text-ink-muted">Duração do plano</div>
                  <div className="mt-1 font-display text-base font-semibold text-ink">
                    {planMonths} {planMonths === 1 ? 'mês' : 'meses'}
                  </div>
                </div>
                <div className="rounded-2xl border border-ink/5 bg-se-mist/60 p-4">
                  <div className="text-xs text-ink-muted">Sessões do protocolo</div>
                  <div className="mt-1 font-display text-base font-semibold text-ink">
                    {PROTOCOL_TOTAL_SESSIONS} encontros
                  </div>
                </div>
              </div>

              {/* Values of the chosen protocol */}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-ink/5 p-3 text-center">
                  <div className="text-[11px] text-ink-muted">Valor por encontro</div>
                  <div className="mt-1 font-display text-lg font-semibold text-ink">
                    R${fmtCurrency(parseFloat(pricePerSession || '0')).replace('R$ ', '')}
                  </div>
                </div>
                <div className="rounded-xl border border-ink/5 p-3 text-center">
                  <div className="text-[11px] text-ink-muted">Plano mensal</div>
                  <div className="mt-1 font-display text-lg font-semibold text-ink">
                    R${fmtCurrency(parseFloat(priceMonthly || '0')).replace('R$ ', '')}
                  </div>
                </div>
                <div className="rounded-xl border border-ink/5 p-3 text-center">
                  <div className="text-[11px] text-ink-muted">Plano completo</div>
                  <div className="mt-1 font-display text-lg font-semibold text-ink">
                    R${fmtCurrency(parseFloat(priceComplete || '0')).replace('R$ ', '')}
                  </div>
                </div>
              </div>
            </div>

            {/* Payments / amounts paid */}
            <div className="card mt-6 p-6 md:p-8">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-se-violet" />
                <h2 className="font-display text-lg font-semibold text-ink">Valores pagos</h2>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-ink/5 p-3 text-center">
                  <div className="text-[11px] text-ink-muted">Total pago</div>
                  <div className="mt-1 font-display text-lg font-semibold text-se-teal">{fmtCurrency(totalPaid)}</div>
                </div>
                <div className="rounded-xl border border-ink/5 p-3 text-center">
                  <div className="text-[11px] text-ink-muted">Sessões realizadas</div>
                  <div className="mt-1 font-display text-lg font-semibold text-ink">
                    {realized} / {PROTOCOL_TOTAL_SESSIONS}
                  </div>
                </div>
                <div className="rounded-xl border border-ink/5 p-3 text-center">
                  <div className="text-[11px] text-ink-muted">Meses do plano</div>
                  <div className="mt-1 font-display text-lg font-semibold text-ink">
                    {planMonths} {planMonths === 1 ? 'mês' : 'meses'}
                  </div>
                </div>
              </div>

              {displayPayments.length === 0 ? (
                <p className="mt-6 text-sm text-ink-muted">Nenhum pagamento registrado ainda.</p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                        <th className="px-3 py-2 font-semibold">Data</th>
                        <th className="px-3 py-2 font-semibold">Modalidade</th>
                        <th className="px-3 py-2 font-semibold">Plano</th>
                        <th className="px-3 py-2 font-semibold">Valor</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPayments.map((p) => (
                        <tr key={p.id} className="border-b border-ink/5 last:border-b-0">
                          <td className="px-3 py-3 text-ink-soft">{fmtDate(p.created_at)}</td>
                          <td className="px-3 py-3 text-ink-soft">{MODALITY_LABELS[p.modality]}</td>
                          <td className="px-3 py-3 capitalize text-ink-soft">
                            {p.plan === 'mensal' ? 'Plano mensal' : 'Plano completo'}
                          </td>
                          <td className="px-3 py-3 font-medium text-ink">{fmtCurrency(p.amount)}</td>
                          <td className="px-3 py-3">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Agenda */}
            <div className="card mt-6 p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-se-violet" />
                  <h2 className="font-display text-lg font-semibold text-ink">Minha agenda de atendimentos</h2>
                </div>
                <span className="rounded-full bg-se-lavender px-3 py-1 text-xs font-medium text-se-violet">
                  {remaining} sessão{remaining === 1 ? '' : 's'} restante{remaining === 1 ? '' : 's'}
                </span>
              </div>

              {sessions.length === 0 ? (
                <p className="mt-6 text-sm text-ink-muted">
                  Seus atendimentos aparecerão aqui conforme forem agendados pelo analista.
                </p>
              ) : (
                <div className="mt-5 space-y-2.5">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-ink/5 bg-se-mist/50 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-ink">{fmtDate(s.date)}</div>
                        {s.notes && <div className="mt-0.5 text-xs text-ink-muted">{s.notes}</div>}
                      </div>
                      <SessionBadge status={s.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="relative z-10 pb-10 text-center">
        <div className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          <p>A tecnologia organiza dados.</p>
          <p>A metodologia gera compreensão.</p>
          <p>O especialista conduz a transformação.</p>
        </div>
      </footer>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-se-teal/10 px-2.5 py-0.5 text-[10px] font-semibold text-se-teal">
        <Check className="h-3 w-3" /> Aprovado
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-600">
        <Clock className="h-3 w-3" /> Pendente
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-600">
      <X className="h-3 w-3" /> Reprocessar
    </span>
  )
}

function SessionBadge({ status }: { status: SessionRecord['status'] }) {
  if (status === 'realizada') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-se-teal/10 px-2.5 py-0.5 text-[10px] font-semibold text-se-teal">
        <Check className="h-3 w-3" /> Realizada
      </span>
    )
  }
  if (status === 'faltou') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-600">
        <X className="h-3 w-3" /> Faltou
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-se-sky px-2.5 py-0.5 text-[10px] font-semibold text-se-teal">
      <Clock className="h-3 w-3" /> Agendada
    </span>
  )
}
