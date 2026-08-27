import { useCallback, useEffect, useState } from 'react'
import { Phone, Sparkles } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

interface Lead {
  id: string
  name: string
  phone: string
  modality: string
  created_at: string
}

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('protocol_leads')
        .select('*')
        .order('created_at', { ascending: false })
      setLeads(data ?? [])
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Marcar como visto
    localStorage.setItem('synapt_leads_last_seen', new Date().toISOString())
  }, [load])

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <AdminLayout>
      <div className="mb-4 md:mb-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-se-violet md:text-[11px]">
          Protocolo de Resgate de Identidade
        </div>
        <h1 className="mt-0.5 font-display text-2xl font-semibold text-ink md:text-3xl">
          Interesses
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pessoas que demonstraram interesse no protocolo e deixaram contato para retorno.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 mb-6">
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Total</div>
          <div className="mt-1 font-display text-2xl font-semibold text-se-violet">{leads.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Modalidade Social</div>
          <div className="mt-1 font-display text-2xl font-semibold text-se-teal">
            {leads.filter((l) => l.modality === 'social').length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Protocolo Integral</div>
          <div className="mt-1 font-display text-2xl font-semibold text-se-violet">
            {leads.filter((l) => l.modality === 'integral').length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink/5 p-4">
          <Sparkles className="h-5 w-5 text-se-violet" />
          <h2 className="font-display text-lg font-semibold text-ink">
            Todos os interesses
          </h2>
          <span className="rounded-full bg-se-lavender px-2.5 py-0.5 text-xs font-medium text-se-violet">
            {leads.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
          </div>
        ) : leads.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-ink-muted">
            Nenhum interesse registrado ainda.
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden">
              {leads.map((lead) => (
                <div key={lead.id} className="border-b border-ink/5 px-4 py-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-ink">{lead.name}</div>
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
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${lead.modality === 'integral' ? 'bg-se-lavender text-se-violet' : 'bg-se-sky text-se-teal'}`}>
                      {lead.modality === 'integral' ? 'Integral' : 'Social'}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-ink-muted">{fmtDate(lead.created_at)}</div>
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
                    <th className="px-5 py-3 font-semibold">Data</th>
                    <th className="px-5 py-3 font-semibold">Contato</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-ink/5 transition-colors hover:bg-se-mist/60">
                      <td className="px-5 py-3 font-medium text-ink">{lead.name}</td>
                      <td className="px-5 py-3 text-ink-soft">{lead.phone}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${lead.modality === 'integral' ? 'bg-se-lavender text-se-violet' : 'bg-se-sky text-se-teal'}`}>
                          {lead.modality === 'integral' ? 'Protocolo Integral' : 'Modalidade Social'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{fmtDate(lead.created_at)}</td>
                      <td className="px-5 py-3">
                        <a
                          href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/10 px-3 py-1.5 text-xs font-medium text-[#25D366] transition hover:bg-[#25D366]/20"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
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
