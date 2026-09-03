import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Sparkles, Trash2, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

interface Lead {
  id: string
  name: string
  phone: string
  modality: string
  created_at: string
}

interface PaymentRecord {
  id: string
  lead_id: string
  modality: string
  amount: number
  status: string
  mp_payment_id: string | null
  payer_name: string | null
  payer_email: string | null
  created_at: string
}

type LeadWithPayment = Lead & { payment?: PaymentRecord }

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  approved: { label: 'Aprovado', icon: CheckCircle, color: 'text-se-teal bg-se-teal/10' },
  pending: { label: 'Pendente', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  rejected: { label: 'Rejeitado', icon: XCircle, color: 'text-red-600 bg-red-50' },
  error: { label: 'Erro', icon: XCircle, color: 'text-red-600 bg-red-50' },
}

function monthKey(iso: string) {
  return iso.slice(0, 7)
}

function yearKey(iso: string) {
  return iso.slice(0, 4)
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function Leads() {
  const [leads, setLeads] = useState<LeadWithPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const load = useCallback(async () => {
    try {
      const [leadsResult, paymentsResult] = await Promise.all([
        supabase.from('protocol_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
      ])

      const leadsData = leadsResult.data ?? []
      const paymentsData = paymentsResult.data ?? []

      const paymentsByLead = new Map<string, PaymentRecord>()
      for (const p of paymentsData) {
        if (p.lead_id && !paymentsByLead.has(p.lead_id)) {
          paymentsByLead.set(p.lead_id, p)
        }
      }

      const merged: LeadWithPayment[] = leadsData.map((lead) => ({
        ...lead,
        payment: paymentsByLead.get(lead.id),
      }))

      setLeads(merged)
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    localStorage.setItem('synapt_leads_last_seen', new Date().toISOString())
  }, [load])

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(`Excluir o perfil de ${name}? Essa ação não pode ser desfeita.`)
    if (!confirmed) return
    await supabase.from('payments').delete().eq('lead_id', id)
    await supabase.from('protocol_leads').delete().eq('id', id)
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function fmtCurrency(value: number) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`
  }

  function PaymentBadge({ status }: { status: string }) {
    const config = STATUS_MAP[status] || STATUS_MAP.error
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentYear = new Date().getFullYear().toString()

  const availableYears = Array.from(new Set(leads.map((l) => yearKey(l.created_at))))
    .sort()
    .reverse()
  const availableMonths = Array.from(new Set(leads.map((l) => monthKey(l.created_at))))
    .sort()
    .reverse()

  const activeYear = availableYears.includes(selectedYear) ? selectedYear : currentYear
  const yearMonths =
    activeYear === 'todos'
      ? availableMonths
      : availableMonths.filter((m) => m.startsWith(activeYear))
  const activeMonth = yearMonths.includes(selectedMonth) ? selectedMonth : currentMonth

  let filteredLeads = leads
  if (activeYear !== 'todos') {
    filteredLeads = filteredLeads.filter((l) => yearKey(l.created_at) === activeYear)
  }
  if (activeMonth !== 'todos') {
    filteredLeads = filteredLeads.filter((l) => monthKey(l.created_at) === activeMonth)
  }
  const filteredPaid = filteredLeads.filter((l) => l.payment?.status === 'approved')
  const filteredRevenue = filteredPaid.reduce((sum, l) => sum + (l.payment?.amount ?? 0), 0)

  return (
    <AdminLayout>
      <div className="mb-4 md:mb-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-se-violet md:text-[11px]">
          Protocolo de Resgate de Identidade
        </div>
        <h1 className="mt-0.5 font-display text-2xl font-semibold text-ink md:text-3xl">
          Perfil terapêutico
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Perfis de pacientes com contato registrado, levantamento e pagamentos realizados.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-6">
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Total</div>
          <div className="mt-1 font-display text-2xl font-semibold text-se-violet">{filteredLeads.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Social</div>
          <div className="mt-1 font-display text-2xl font-semibold text-se-teal">
            {filteredLeads.filter((l) => l.modality === 'social').length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Integral</div>
          <div className="mt-1 font-display text-2xl font-semibold text-se-violet">
            {filteredLeads.filter((l) => l.modality === 'integral').length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Pagos</div>
          <div className="mt-1 font-display text-2xl font-semibold text-se-teal">
            {filteredPaid.length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Receita</div>
          <div className="mt-1 font-display text-2xl font-semibold text-ink">
            {fmtCurrency(filteredRevenue)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-se-violet" />
            <h2 className="font-display text-lg font-semibold text-ink">
              {activeYear === 'todos' && activeMonth === 'todos'
                ? 'Todos os perfis'
                : activeMonth === 'todos'
                  ? `Perfis de ${activeYear}`
                  : `Perfis de ${monthLabel(activeMonth)} ${yearKey(activeMonth)}`}
            </h2>
            <span className="rounded-full bg-se-lavender px-2.5 py-0.5 text-xs font-medium text-se-violet">
              {filteredLeads.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeYear}
              onChange={(e) => {
                setSelectedYear(e.target.value)
                if (e.target.value !== 'todos') {
                  const months = availableMonths
                    .filter((m) => m.startsWith(e.target.value))
                  setSelectedMonth(months.includes(currentMonth) ? currentMonth : (months[0] ?? 'todos'))
                } else {
                  setSelectedMonth('todos')
                }
              }}
              className="rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-sm text-ink focus:border-se-violet focus:outline-none"
            >
              <option value={currentYear}>Ano atual ({currentYear})</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
              <option value="todos">Todos os anos</option>
            </select>
            <select
              value={activeMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-sm text-ink focus:border-se-violet focus:outline-none"
            >
              <option value={currentMonth}>Mês atual ({monthLabel(currentMonth)})</option>
              {yearMonths.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
              <option value="todos">Todos os meses</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-ink-muted">
            Nenhum perfil registrado neste mês.
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden">
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="border-b border-ink/5 px-4 py-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/admin/interesses/${lead.id}`} className="text-sm font-medium text-ink hover:text-se-violet">
                        {lead.name}
                      </Link>
                      <a
                        href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1.5 text-xs text-se-teal transition hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </a>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${lead.modality === 'integral' ? 'bg-se-lavender text-se-violet' : 'bg-se-sky text-se-teal'}`}>
                        {lead.modality === 'integral' ? 'Integral' : 'Social'}
                      </span>
                      {lead.payment && (
                        <PaymentBadge status={lead.payment.status} />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-ink-muted">{fmtDate(lead.created_at)}</span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/admin/interesses/${lead.id}`}
                        className="rounded-full border border-se-violet/20 p-1.5 text-se-violet transition hover:bg-se-lavender"
                        title="Ver perfil terapêutico"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(lead.id, lead.name)}
                        className="rounded-full border border-red-200 p-1.5 text-red-600 transition hover:bg-red-50"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-5 py-3 font-semibold">Nome</th>
                    <th className="px-5 py-3 font-semibold">Telefone</th>
                    <th className="px-5 py-3 font-semibold">Modalidade</th>
                    <th className="px-5 py-3 font-semibold">Pagamento</th>
                    <th className="px-5 py-3 font-semibold">Valor</th>
                    <th className="px-5 py-3 font-semibold">Data</th>
                    <th className="px-5 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-ink/5 transition-colors hover:bg-se-mist/60">
                      <td className="px-5 py-3">
                        <Link to={`/admin/interesses/${lead.id}`} className="font-medium text-ink hover:text-se-violet">
                          {lead.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{lead.phone}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${lead.modality === 'integral' ? 'bg-se-lavender text-se-violet' : 'bg-se-sky text-se-teal'}`}>
                          {lead.modality === 'integral' ? 'Protocolo Integral' : 'Modalidade Social'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {lead.payment ? (
                          <PaymentBadge status={lead.payment.status} />
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">
                        {lead.payment ? fmtCurrency(lead.payment.amount) : '—'}
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{fmtDate(lead.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/interesses/${lead.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-se-violet/20 px-3 py-1.5 text-xs font-medium text-se-violet transition hover:bg-se-lavender"
                            title="Ver perfil terapêutico"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                          </Link>
                          <button
                            onClick={() => handleDelete(lead.id, lead.name)}
                            className="rounded-full border border-red-200 p-1.5 text-red-600 transition hover:bg-red-50 hover:border-red-300"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
