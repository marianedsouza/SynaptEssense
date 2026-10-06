import { useEffect, useRef, useState } from 'react'
import { CheckCheck, MessageCircle, Send, User } from 'lucide-react'
import {
  fetchMessages,
  markThreadRead,
  sendMessage,
  subscribeMessages,
  type Message,
} from '../../lib/messages'
import { useSettings } from '../../context/SettingsContext'

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface AdminMessagesPanelProps {
  email: string
}

/** Sistema de mensagens (item 14) — conversa da analista com o participante. */
export function AdminMessagesPanel({ email }: AdminMessagesPanelProps) {
  const { settings } = useSettings()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchMessages(email)
      .then((list) => {
        if (!cancelled) setMessages(list)
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [email])

  // Marca como lidas as mensagens enviadas pelo participante ao abrir
  useEffect(() => {
    markThreadRead(email, 'participant')
  }, [email, messages.length])

  useEffect(() => {
    const unsubscribe = subscribeMessages(email, (m) => {
      setMessages((prev) => [...prev, m])
      if (m.sender === 'participant') markThreadRead(email, 'participant')
    })
    return unsubscribe
  }, [email])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  async function handleSend() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    const sent = await sendMessage(email, 'analyst', body)
    if (sent) setMessages((prev) => [...prev, sent])
    setDraft('')
    setSending(false)
  }

  const analystName = settings.analyst_name || 'Analista'

  return (
    <div className="card mt-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink/5 p-5">
        <MessageCircle className="h-5 w-5 text-se-violet" />
        <h2 className="font-display text-lg font-semibold text-ink">Mensagens com o participante</h2>
      </div>

      <div
        ref={listRef}
        className="max-h-96 space-y-3 overflow-y-auto bg-se-mist/40 p-5"
      >
        {loading ? (
          <div className="space-y-3 py-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-white/60" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-se-lavender">
              <MessageCircle className="h-4 w-4 text-se-violet" />
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              Nenhuma mensagem trocada ainda. Use este espaço para enviar recados ao{' '}
              participante — ele verá em tempo real na área do usuário.
            </p>
          </div>
        ) : (
          messages.map((m) =>
            m.sender === 'analyst' ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-se-violet px-4 py-2.5 text-sm text-white">
                  <div className="text-[10px] font-semibold text-white/80">{analystName}</div>
                  <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/70">
                    {m.read_at ? (
                      <span className="flex items-center gap-0.5">
                        <CheckCheck className="h-3 w-3" /> Lida {m.read_at ? fmtTime(m.read_at) : ''}
                      </span>
                    ) : (
                      <span>Entregue</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-ink/5 bg-white px-4 py-2.5 text-sm text-ink">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-se-violet">
                    <User className="h-3 w-3" /> Participante
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-ink-muted">
                    {fmtTime(m.created_at)}
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-ink/5 p-5">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={sending}
          placeholder="Escreva sua mensagem…"
          className="input min-h-[56px] flex-1 resize-none disabled:opacity-40"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="btn-primary flex h-12 w-12 shrink-0 items-center justify-center p-0 disabled:opacity-40"
          aria-label="Enviar mensagem"
        >
          {sending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}