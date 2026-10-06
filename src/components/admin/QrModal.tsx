import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, X } from 'lucide-react'

interface QrModalProps {
  url: string
  title: string
  fileName: string
  onClose: () => void
}

/** QR Code do item 8 do roadmap: gera localmente e permite baixar o PNG. */
export function QrModal({ url, title, fileName, onClose }: QrModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#1a1a2e', light: '#ffffff' },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="card w-full max-w-sm animate-fade-up p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-se-violet">
              QR Code
            </div>
            <h3 className="mt-0.5 font-display text-lg font-semibold text-ink">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-muted transition hover:bg-se-mist hover:text-ink"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex justify-center">
          {error ? (
            <div className="text-center text-sm text-ink-muted">
              Não foi possível gerar o QR Code para este link.
            </div>
          ) : dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR Code de ${title}`}
              className="mb-3 h-56 w-56 rounded-xl border border-ink/10 bg-white p-2"
            />
          ) : (
            <div className="h-56 w-56 animate-pulse rounded-xl bg-se-mist" />
          )}
        </div>

        <p className="truncate text-center text-xs text-ink-muted">{url}</p>

        <a
          href={dataUrl ?? undefined}
          download={fileName}
          aria-disabled={!dataUrl}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-all ${
            dataUrl
              ? 'btn-primary'
              : 'pointer-events-none opacity-40'
          }`}
        >
          <Download className="h-3.5 w-3.5" />
          Baixar PNG
        </a>
      </div>
    </div>
  )
}