import { Request, Response } from 'express'
import { authService } from './auth.service'
import { env } from '../../config/env'
import { AppError } from '../../middlewares/error.middleware'

const REFRESH_COOKIE = 'refreshToken'

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 86_400_000,
  }
}

// Express 5 captura automáticamente los errores de funciones async
export const authController = {
  login: async (req: Request, res: Response) => {
    const { accessToken, refreshToken, user } = await authService.login(
      req.body.email,
      req.body.password,
      req.ip,
    )
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions())
    res.json({ data: { accessToken, user } })
  },

  googleLogin: async (req: Request, res: Response) => {
    const { accessToken, refreshToken, user } = await authService.loginWithGoogle(
      req.body.accessToken,
      req.ip,
    )
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions())
    res.json({ data: { accessToken, user } })
  },

  refresh: async (req: Request, res: Response) => {
    const rawToken = req.cookies[REFRESH_COOKIE]
    if (!rawToken) throw new AppError(401, 'UNAUTHORIZED', 'Refresh token requerido')
    const { accessToken, refreshToken } = await authService.refresh(rawToken, req.ip)
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions())
    res.json({ data: { accessToken } })
  },

  logout: async (req: Request, res: Response) => {
    const rawToken = req.cookies[REFRESH_COOKIE]
    if (rawToken) await authService.logout(rawToken, req.user?.id, req.ip)
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined })
    res.json({ data: { message: 'Sesión cerrada' } })
  },

  me: async (req: Request, res: Response) => {
    const user = await authService.me(req.user!.id)
    res.json({ data: user })
  },

  changePassword: async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.id, req.body.current, req.body.next, req.ip)
    res.json({ data: { message: 'Contraseña actualizada' } })
  },
}
