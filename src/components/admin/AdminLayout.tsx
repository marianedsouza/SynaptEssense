import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Settings, Sparkles, Users } from 'lucide-react'
import { Logo } from '../Logo'
import { supabase } from '../../lib/supabase'

const navItems = [
  { to: '/admin', label: 'Vis\u00e3o geral', icon: LayoutDashboard, end: true, badge: false },
  { to: '/admin/interesses', label: 'Interesses', icon: Sparkles, end: true, badge: true },
  { to: '/admin/participantes', label: 'Participantes', icon: Users, end: true, badge: false },
  { to: '/admin/configuracoes', label: 'Configura\u00e7\u00f5es', icon: Settings, end: true, badge: false },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [unseenCount, setUnseenCount] = useState(0)

  useEffect(() => {
    async function checkUnseen() {
      try {
        const lastSeen = localStorage.getItem('synapt_leads_last_seen') || '2000-01-01T00:00:00Z'
        const { count } = await supabase
          .from('protocol_leads')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', lastSeen)
        setUnseenCount(count ?? 0)
      } catch {
        setUnseenCount(0)
      }
    }
    checkUnseen()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-se-mist">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden border-r border-ink/5 bg-white md:flex">
        <div className="px-6 py-6">
          <Logo size="lg" />
        </div>
        <div className="px-6 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Painel do analista
        </div>
        <nav className="scrollbar-hide flex-1 space-y-1 overflow-y-auto px-4">
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
              {item.badge && unseenCount > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-se-violet px-1.5 text-[10px] font-bold text-white">
                  {unseenCount}
                </span>
              )}
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
        <header className="sticky top-0 z-20 border-b border-ink/5 bg-white/85 px-4 py-2.5 backdrop-blur-md md:hidden">
          <div className="relative flex items-center justify-center">
            <Logo size="md" />
            <button
              onClick={handleLogout}
              className="absolute right-0 rounded-full p-1.5 text-ink-muted hover:bg-se-mist"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <nav className="scrollbar-hide mt-2 flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                    isActive
                      ? 'bg-se-lavender text-se-violet-dark'
                      : 'text-ink-soft hover:text-ink'
                  }`
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
                {item.badge && unseenCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-se-violet px-1 text-[9px] font-bold text-white">
                    {unseenCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-4 py-4 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  )
}
