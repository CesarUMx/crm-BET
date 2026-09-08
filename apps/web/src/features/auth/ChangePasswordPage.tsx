import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import { changePasswordSchema, type ChangePasswordInput } from 'shared'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../lib/auth.store'
import { authApi } from './api'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) })

  const onSubmit = async (data: ChangePasswordInput) => {
    try {
      await authApi.changePassword(data)
      toast.success('Contraseña actualizada. Inicia sesión nuevamente.')
      clearAuth()
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Error al cambiar contraseña'
      toast.error(message)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Fondo azul institucional */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #004A87 0%, #006EBF 100%)' }} />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#006EBF] opacity-20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#004A87] opacity-20 blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg">
            <span className="text-2xl font-black text-white">UMx</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Control de Alumnos</h1>
          <p className="mt-1 text-sm text-white/70">Universidad Mondragón UMx</p>
        </div>

        {/* Tarjeta */}
        <div className="overflow-hidden rounded-2xl shadow-2xl">
          {/* Header naranja — contrasta con fondo azul */}
          <div className="px-8 py-5" style={{ background: 'linear-gradient(90deg, #E9511D, #FF6E00)' }}>
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-white" />
              <p className="text-sm font-semibold text-white">Cambiar contraseña</p>
            </div>
            <p className="mt-0.5 text-xs text-white/70">
              {user?.mustChangePassword
                ? 'Primer inicio de sesión — debes establecer una nueva contraseña.'
                : 'Ingresa tu contraseña actual y la nueva.'}
            </p>
          </div>

          {/* Formulario */}
          <div className="bg-white px-8 py-8">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Contraseña actual"
                type="password"
                autoComplete="current-password"
                error={errors.current?.message}
                {...register('current')}
              />
              <Input
                label="Nueva contraseña"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 12 caracteres"
                error={errors.next?.message}
                {...register('next')}
              />

              <Button
                type="submit"
                variant="brandBlue"
                loading={isSubmitting}
                className="mt-1 w-full"
              >
                Guardar contraseña
              </Button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">© 2026 Universidad Mondragón UMx</p>
      </div>
    </div>
  )
}
