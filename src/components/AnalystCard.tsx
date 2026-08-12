import { getDefaultAnalystProfile } from '../lib/settings'
import type { AnalystProfile } from '../lib/types'

interface AnalystCardProps {
  profile?: AnalystProfile
  compact?: boolean
}

export function AnalystCard({ profile, compact = false }: AnalystCardProps) {
  const p = profile ?? getDefaultAnalystProfile()

  return (
    <div className={`card flex items-center gap-5 p-6 ${compact ? 'max-w-md' : ''}`}>
      {p.photoUrl ? (
        <img
          src={p.photoUrl}
          alt={p.name}
          className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-se-violet/20"
        />
      ) : (
        <div className="bg-grad grid h-20 w-20 shrink-0 place-items-center rounded-2xl">
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none">
            <circle cx="12" cy="8" r="3.4" stroke="white" strokeWidth="1.5" />
            <path
              d="M5.5 19c.8-3.2 3.2-4.8 6.5-4.8s5.7 1.6 6.5 4.8"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
          Por trás desta experiência
        </div>
        <div className="font-display text-xl font-semibold text-ink">{p.name}</div>
        <p className="mt-0.5 text-sm text-ink-soft">{p.title}</p>
        {!compact && p.bio && (
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.bio}</p>
        )}
      </div>
    </div>
  )
}
