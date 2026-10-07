import { NavLink } from 'react-router'
import { LayoutDashboard, Users, BookOpen, ShieldCheck, GraduationCap, UserCog } from 'lucide-react'
import { useAuthStore } from '../../lib/auth.store'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/alumnos', label: 'Alumnos', icon: Users },
  { to: '/cursos', label: 'Cursos', icon: BookOpen },
]

const portalNavItems = [{ to: '/portal', label: 'Mi portal', icon: GraduationCap, end: true }]

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'COORDINADOR'

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-[var(--surface)]">
      <nav className="flex-1 overflow-y-auto p-3 pt-4">
        <ul className="flex flex-col gap-1">
          {(isStaff ? navItems : portalNavItems).map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#E9511D] text-white shadow-sm shadow-[#E9511D]/30'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--hover-surface)] hover:text-[var(--text-primary)]',
                  ].join(' ')
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            </li>
          ))}

          {user?.role === 'SUPER_ADMIN' && (
            <li>
              <NavLink
                to="/usuarios"
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#E9511D] text-white shadow-sm shadow-[#E9511D]/30'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--hover-surface)] hover:text-[var(--text-primary)]',
                  ].join(' ')
                }
              >
                <ShieldCheck className="size-4" />
                Usuarios
              </NavLink>
            </li>
          )}

          {/* Coordinador no gestiona usuarios en general, solo da de alta Docentes */}
          {user?.role === 'COORDINADOR' && (
            <li>
              <NavLink
                to="/docentes"
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#E9511D] text-white shadow-sm shadow-[#E9511D]/30'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--hover-surface)] hover:text-[var(--text-primary)]',
                  ].join(' ')
                }
              >
                <UserCog className="size-4" />
                Docentes
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="m-3 rounded-xl border border-[var(--border-faint)] bg-[var(--chip-bg)] p-3">
        <p className="truncate text-xs font-medium text-[var(--text-primary)]">{user?.name}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
      </div>
    </aside>
  )
}
