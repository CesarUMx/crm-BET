import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authController } from './auth.controller'
import { validate } from '../../middlewares/validate.middleware'
import { requireAuth } from '../../middlewares/auth.middleware'
import { loginSchema, changePasswordSchema } from 'shared'
import { z } from 'zod'

const googleAuthSchema = z.object({ accessToken: z.string().min(1, 'accessToken requerido') })

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiados intentos. Espere 15 minutos.' } },
})

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
})

export const authRouter = Router()

authRouter.post('/login', loginLimiter, validate(loginSchema), authController.login)
authRouter.post('/google', loginLimiter, validate(googleAuthSchema), authController.googleLogin)
authRouter.post('/refresh', refreshLimiter, authController.refresh)
authRouter.post('/logout', authController.logout)
authRouter.get('/me', requireAuth, authController.me)
authRouter.put('/password', requireAuth, validate(changePasswordSchema), authController.changePassword)
