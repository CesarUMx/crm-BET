import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '../ui/Button'
import { useAuthStore } from '../../lib/auth.store'
import { api } from '../../lib/axios'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignorar errores: el token del servidor puede estar ya expirado
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
      toast.success('Sesión cerrada')
    }
  }

  return (
    <div className="relative flex h-screen items-stretch overflow-hidden bg-[var(--bg)] p-3">
      {/* Detalles decorativos de fondo, coherentes con el login */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#004A87] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#E9511D] opacity-10 blur-3xl" />

      {/* Panel flotante único: barra superior + (sidebar + contenido), con borde y esquinas redondeadas */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-2xl">
        {/* Barra superior: azul sólido institucional, siempre igual en ambos temas */}
        <header className="flex shrink-0 items-center justify-between bg-[#004A87] px-6 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E9511D] px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-[#E9511D]/30">
            Control Alumnos
          </span>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
              Universidad Mondragón UMx
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-100">
              {user?.name}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="!text-slate-300 hover:!bg-white/10 hover:!text-slate-100">
              <LogOut className="size-4" />
              Salir
            </Button>
          </div>
        </header>

        {/* Fila inferior: sidebar + separador azul oscuro + contenido */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="w-px shrink-0 bg-[#004A87]" />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
