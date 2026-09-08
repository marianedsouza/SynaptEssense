import { useState } from 'react'
import { Link2, Check, MessageCircle, Copy, ExternalLink, Sparkles } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'

interface ShareLink {
  label: string
  description: string
  path: string
  recommended?: boolean
}

const SHARE_LINKS: ShareLink[] = [
  {
    label: 'Página Inicial',
    description: 'Landing page principal da plataforma',
    path: '/',
  },
  {
    label: 'Protocolo de Resgate de Identidade',
    description: 'Página do protocolo com diagnóstico e modalidades',
    path: '/protocolo',
    recommended: true,
  },
  {
    label: 'Minha Área',
    description: 'Área do participante para acompanhar progresso',
    path: '/minha-area',
  },
  {
    label: 'Login Minha Área',
    description: 'Acesso à área restrita do participante',
    path: '/minha-area/login',
  },
]

const SHARE_MESSAGE = 'SynaptEssence360® — Plataforma de Tecnologia Social para o Desenvolvimento Humano Integral. Toda transformação começa quando novas conexões são criadas.'

export function ShareLinks() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  function getFullUrl(path: string) {
    return `${window.location.origin}${path}`
  }

  const handleCopy = async (url: string, index: number) => {
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
    setCopiedIndex(index)
    window.setTimeout(() => setCopiedIndex(null), 2500)
  }

  const handleWhatsApp = (url: string) => {
    const text = `${SHARE_MESSAGE} ${url}`
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <AdminLayout>
      <div className="mb-4 md:mb-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-se-violet md:text-[11px]">
          SynaptEssence360®
        </div>
        <h1 className="mt-0.5 font-display text-2xl font-semibold text-ink md:text-3xl">
          Links para Compartilhamento
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Copie ou compartilhe os links das páginas da plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SHARE_LINKS.map((link, index) => {
          const url = getFullUrl(link.path)
          const isCopied = copiedIndex === index

          return (
            <div
              key={link.path}
              className={`card relative p-6 transition-all ${
                link.recommended
                  ? 'border-2 border-se-violet/20'
                  : 'border border-ink/5'
              }`}
            >
              {link.recommended && (
                <div className="absolute -top-3 left-6 flex items-center gap-1.5 rounded-full bg-se-violet px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                  <Sparkles className="h-3 w-3" />
                  Protocolo recomendado
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold text-ink">
                    {link.label}
                  </h3>
                  <p className="mt-1 text-xs text-ink-muted">{link.description}</p>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-2 text-ink-muted transition hover:bg-se-mist hover:text-ink"
                  aria-label="Abrir página"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink/10 bg-se-mist/50 px-3 py-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                  {url}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleCopy(url, index)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                    isCopied
                      ? 'bg-green-50 text-green-700 border border-green-200'
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
                  onClick={() => handleWhatsApp(url)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </AdminLayout>
  )
}