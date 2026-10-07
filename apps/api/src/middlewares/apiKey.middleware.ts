import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { env } from '../config/env'
import { AppError } from './error.middleware'

// Protege endpoints públicos (integraciones externas) con una API key estática,
// enviada en el header "x-api-key". Comparación en tiempo constante para evitar timing attacks.
export function requireApiKey(req: Request, _res: Response, next: NextFunction): void {
  const provided = req.headers['x-api-key']

  if (typeof provided !== 'string' || !provided) {
    next(new AppError(401, 'UNAUTHORIZED', 'API key requerida'))
    return
  }

  const expected = Buffer.from(env.PUBLIC_API_KEY)
  const actual = Buffer.from(provided)

  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    next(new AppError(401, 'UNAUTHORIZED', 'API key inválida'))
    return
  }

  next()
}
