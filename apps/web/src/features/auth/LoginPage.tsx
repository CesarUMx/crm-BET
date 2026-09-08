import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { LogIn } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { loginSchema, type LoginInput } from 'shared'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../lib/auth.store'
import { authApi } from './api'

// Ícono oficial de Google (colores de marca)
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  // useGoogleLogin permite botón custom; el access_token se verifica en el backend
  const triggerGoogle = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      try {
        const { data: res } = await authApi.googleLogin(tokenResponse.access_token)
        setAuth(res.data.accessToken, res.data.user)
        navigate('/', { replace: true })
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ?? 'Este correo no está autorizado'
        toast.error(msg)
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => toast.error('No se pudo iniciar sesión con Google'),
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      const { data: res } = await authApi.login(data)
      const { accessToken, user } = res.data
      setAuth(accessToken, user)
      navigate(user.mustChangePassword ? '/cambiar-contrasena' : '/', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Error al iniciar sesión'
      toast.error(message)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Fondo fijo institucional */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #004A87 0%, #006EBF 100%)' }}
      />

      {/* Círculos decorativos */}
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#006EBF] opacity-20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#004A87] opacity-20 blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Logo + título */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg">
            <span className="text-2xl font-black text-white">UMx</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Control de Alumnos</h1>
          <p className="mt-1 text-sm text-white/70">Universidad Mondragón UMx</p>
        </div>

        {/* Tarjeta única con ambas opciones de acceso */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex flex-col items-center gap-6 px-8 pt-8">
            {/* Botón de Google con diseño custom */}
            <button
              type="button"
              onClick={() => triggerGoogle()}
              disabled={googleLoading}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md active:scale-[0.98] disabled:opacity-60"
            >
              {googleLoading ? (
                <span className="size-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              ) : (
                <GoogleIcon className="size-5 shrink-0" />
              )}
              <span className="flex-1 text-center">
                {googleLoading ? 'Verificando…' : 'Continuar con Google'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 px-8 py-5">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-400">o</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-8 pb-8">
            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="usuario@mondragonmexico.edu.mx"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" variant="brandBlue" loading={isSubmitting} className="mt-1 w-full">
              <LogIn className="size-4" />
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          © 2026 Universidad Mondragón UMx
        </p>
      </div>
    </div>
  )
}
