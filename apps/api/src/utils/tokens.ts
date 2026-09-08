import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env'

export interface JwtPayload {
  sub: string
  role: string
  tokenVersion: number
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  })
}

export function createRefreshToken() {
  const token = crypto.randomBytes(48).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000)
  return { token, hash, expiresAt }
}
