import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../lib/theme.store'

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-slate-300 transition-colors hover:bg-white/20 hover:text-slate-100"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
