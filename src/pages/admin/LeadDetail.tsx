import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarPlus,
  CalendarDays,
  CheckCircle2,
  Clock,
  Pencil,
  Phone,
  Save,
  Trash2,
} from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { MODALITY_LABELS, PROTOCOL_TOTAL_SESSIONS, planQualityLabel } from '../../lib/protocol'
import { addSession, deleteSession, fetchSessionsByLead, updateSessionStatus, type SessionRecord } from '../../lib/sessions'

interface Lead {
  id: string
  name: string
  phone: string
  email: string | null
  modality: 'social' | 'integral'
  plan: 'mensal' | 'completo' | null
  user_id: string | null
  created_at: string
}

interface PaymentRecord {
  id: string
  status: string
  amount: number
  created_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [lead, setLead] = useState<Lead | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [newDate, setNewDate] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editModality, setEditModality] = useState<'social' | 'integral'>('social')
  const [editPlan, setEditPlan] = useState<'mensal' | 'completo'>('completo')
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const [leadRes, payRes] = await Promise.all([
      supabase.from('protocol_leads').select('*').eq('id', id).maybeSingle(),
      supabase.from('payments').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    ])
    if (!leadRes.data) {
      setNotFound(true)
      setLoading(false)
      return
    }
    const leadData = leadRes.data as Lead
    setLead(leadData)
    setPayments((payRes.data ?? []) as PaymentRecord[])
    setSessions(await fetchSessionsByLead(leadData.id))
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
        </div>
      </AdminLayout>
    )
  }

  if (notFound || !lead) {
    return (
      <AdminLayout>
        <div className="py-16 text-center text-sm text-ink-muted">
          Interesse não encontrado.{' '}
          <Link className="text-se-violet underline" to="/admin/interesses">
            Voltar para os interesses
          </Link>
        </div>
      </AdminLayout>
    )
  }

  const approved = payments.filter((p) => p.status === 'approved')
  const totalPaid = approved.reduce((s, p) => s + (p.amount || 0), 0)
  const lastPayment = payments[0]
  const isPaid = payments.some((p) => p.status === 'approved')

  const realized = sessions.filter((s) => s.status === 'realizada').length
  const remaining = Math.max(PROTOCOL_TOTAL_SESSIONS - realized, 0)

  async function handleAdd() {
    if (!lead || !newDate) return
    await addSession(lead.id, newDate, newNotes || undefined)
    setNewDate('')
    setNewNotes('')
    setSessions(await fetchSessionsByLead(lead.id))
  }

  async function handleStatus(id: string, status: SessionRecord['status']) {
    if (!lead) return
    await updateSessionStatus(id, status)
    setSessions(await fetchSessionsByLead(lead.id))
  }

  async function handleDelete(id: string) {
    if (!lead) return
    await deleteSession(id)
    setSessions(await fetchSessionsByLead(lead.id))
  }

  function startEdit() {
    if (!lead) return
    setEditName(lead.name)
    setEditPhone(lead.phone || '')
    setEditEmail(lead.email || '')
    setEditModality(lead.modality)
    setEditPlan(lead.plan || 'completo')
    setEditError(null)
    setEditing(true)
  }

  async function handleSaveEdit() {
    if (!lead) return
    if (!editName.trim()) {
      setEditError('O nome é obrigatório.')
      return
    }
    setSavingEdit(true)
    setEditError(null)
    const { error } = await supabase
      .from('protocol_leads')
      .update({
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        modality: editModality,
        plan: editPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
    setSavingEdit(false)
    if (error) {
      setEditError(error.message)
      return
    }
    setEditing(false)
    setLead((prev) =>
      prev
        ? {
            ...prev,
            name: editName.trim(),
            phone: editPhone.trim(),
            email: editEmail.trim(),
            modality: editModality,
            plan: editPlan,
          }
        : prev,
    )
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <Link
          to="/admin/interesses"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-se-violet"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Interesses
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold text-ink">{lead.name}</h1>
          {isPaid ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-se-teal/10 px-3 py-1 text-xs font-semibold text-se-teal">
              <CheckCircle2 className="h-3.5 w-3.5" /> Pago
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
              <Clock className="h-3.5 w-3.5" /> {lastPayment ? 'Pendente' : 'Sem pagamento'}
            </span>
          )}
          <button
            onClick={() => (editing ? setEditing(false) : startEdit())}
            className="inline-flex items-center gap-1.5 rounded-full border border-se-violet/20 px-3 py-1 text-xs font-medium text-se-violet transition hover:bg-se-lavender"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editing ? 'Cancelar' : 'Editar dados'}
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Interesse registrado em {fmtDateTime(lead.created_at)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Contato</div>
          <a
            href={`https://wa.me/55${(lead.phone || '').replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1.5 text-sm font-medium text-se-teal hover:underline"
          >
            <Phone className="h-4 w-4" />
            {lead.phone}
          </a>
          <div className="mt-1 text-sm text-ink-soft">{lead.email || '—'}</div>
        </div>
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Protocolo</div>
          <div className="mt-2 text-sm font-semibold text-ink">{MODALITY_LABELS[lead.modality]}</div>
          <div className="mt-1 text-sm text-ink-soft">
            {lead.plan ? planQualityLabel(lead.plan) : 'Plano não definido'} • {PROTOCOL_TOTAL_SESSIONS} sessões
          </div>
        </div>
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Valor pago</div>
          <div className="mt-2 font-display text-xl font-semibold text-ink">
            R$ {totalPaid.toFixed(2).replace('.', ',')}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {payments.length} pagamento{payments.length === 1 ? '' : 's'} registrado{payments.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {editing && (
        <div className="card mt-6 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Pencil className="h-5 w-5 text-se-violet" />
            <h2 className="font-display text-lg font-semibold text-ink">Editar dados do interessado</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome</label>
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="label">Telefone / WhatsApp</label>
              <input className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Modalidade</label>
              <select className="input" value={editModality} onChange={(e) => setEditModality(e.target.value as 'social' | 'integral')}>
                <option value="social">Modalidade Social</option>
                <option value="integral">Protocolo Integral de Reconstrução</option>
              </select>
            </div>
            <div>
              <label className="label">Plano</label>
              <select className="input" value={editPlan} onChange={(e) => setEditPlan(e.target.value as 'mensal' | 'completo')}>
                <option value="mensal">Plano mensal</option>
                <option value="completo">Plano completo</option>
              </select>
            </div>
          </div>
          {editError && <p className="mt-3 text-xs text-red-600">{editError}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={handleSaveEdit} disabled={savingEdit} className="btn-primary">
              <Save className="h-4 w-4" />
              {savingEdit ? 'Salvando…' : 'Salvar alterações'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {/* Agenda */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-se-violet" />
            <h2 className="font-display text-lg font-semibold text-ink">Agenda de atendimentos</h2>
            <span className="rounded-full bg-se-lavender px-2.5 py-0.5 text-xs font-medium text-se-violet">
              {realized}/{PROTOCOL_TOTAL_SESSIONS} realizadas
            </span>
          </div>
        </div>

        <div className="border-b border-ink/5 bg-se-mist/40 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="sm:w-44">
              <label className="label">Data do atendimento</label>
              <input type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="label">Observação (opcional)</label>
              <input className="input" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Ex: 1º encontro de apresentação" />
            </div>
            <button onClick={handleAdd} disabled={!newDate} className="btn-primary !py-2.5 disabled:opacity-40">
              <CalendarPlus className="h-4 w-4" />
              Agendar
            </button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-ink-muted">
            Nenhum atendimento agendado ainda. Adicione a primeira data acima.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/5 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3 font-semibold">Data</th>
                  <th className="px-5 py-3 font-semibold">Observação</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-ink/5 last:border-b-0">
                    <td className="px-5 py-3 font-medium text-ink">{fmtDate(s.date)}</td>
                    <td className="px-5 py-3 text-ink-soft">{s.notes || '—'}</td>
                    <td className="px-5 py-3">
                      <select
                        value={s.status}
                        onChange={(e) => handleStatus(s.id, e.target.value as SessionRecord['status'])}
                        className="rounded-lg border border-ink/10 bg-white px-2.5 py-1 text-xs text-ink focus:border-se-violet focus:outline-none"
                      >
                        <option value="agendada">Agendada</option>
                        <option value="realizada">Realizada</option>
                        <option value="faltou">Faltou</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.status === 'realizada' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-se-teal/10 px-3 py-1 text-[11px] font-semibold text-se-teal">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Concluída
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStatus(s.id, 'realizada')}
                            className="inline-flex items-center gap-1.5 rounded-full bg-se-teal px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-se-teal/90"
                            title="Marcar este atendimento como concluído"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Concluir
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="rounded-full border border-red-200 p-1.5 text-red-600 transition hover:bg-red-50"
                          title="Excluir atendimento"
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
        )}
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        Sessões restantes: <span className="font-semibold text-ink">{remaining}</span> de {PROTOCOL_TOTAL_SESSIONS}.
        O participante verá a agenda e o botão de renovação quando o protocolo for concluído.
      </p>

      <div className="mt-4">
        <button onClick={() => navigate('/admin/interesses')} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" />
          Voltar aos interesses
        </button>
      </div>
    </AdminLayout>
  )
}
