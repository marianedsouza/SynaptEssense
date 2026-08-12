import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Settings, Users } from 'lucide-react'
import { Logo } from '../Logo'
import { supabase } from '../../lib/supabase'

const navItems = [
  { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/admin/participantes', label: 'Participantes', icon: Users, end: true },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, end: true },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-se-mist">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink/5 bg-white md:flex">
        <div className="px-6 py-6">
          <Logo size="lg" />
        </div>
        <div className="px-6 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Painel do analista
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-se-lavender text-se-violet-dark'
                    : 'text-ink-soft hover:bg-se-mist hover:text-ink'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink-muted transition hover:bg-se-mist hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-20 border-b border-ink/5 bg-white/85 px-5 py-4 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between">
            <Logo size="md" />
            <button
              onClick={handleLogout}
              className="rounded-full p-2 text-ink-muted hover:bg-se-mist"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-se-lavender text-se-violet-dark'
                      : 'text-ink-soft hover:text-ink'
                  }`
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-5 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  )
}
