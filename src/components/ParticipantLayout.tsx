import type { ReactNode } from 'react'
import { Logo } from '../components/Logo'

export function ParticipantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-se-violet/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[480px] w-[480px] rounded-full bg-se-teal/10 blur-3xl" />
      </div>
      <header className="relative z-10 flex items-center justify-center px-6 py-6">
        <Logo size="sm" />
      </header>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-16 pt-4">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  )
}
