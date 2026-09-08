import crypto from 'crypto'
import * as argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { AppError } from '../../middlewares/error.middleware'
import { auditService } from '../audit/audit.service'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_MINUTES = 15

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function signAccessToken(userId: string, role: string, tokenVersion: number): string {
  return jwt.sign({ sub: userId, role, tokenVersion }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: 'HS256',
  } as jwt.SignOptions)
}

async function issueRefreshToken(userId: string, ip?: string) {
  const raw = generateRefreshToken()
  const tokenHash = hashToken(raw)
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 86_400_000)
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt, createdByIp: ip } })
  return raw
}

let _googleClient: OAuth2Client | null = null
function getGoogleClient(): OAuth2Client {
  // getTokenInfo no requiere client ID, pero lo reutilizamos por si se necesita
  if (!_googleClient) _googleClient = new OAuth2Client()
  return _googleClient
}

export const authService = {
  async login(email: string, password: string, ip?: string) {
    // Siempre el mismo error genérico: evita enumeración de usuarios
    const INVALID = new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas')

    const user = await prisma.user.findUnique({ where: { email } })
    // Solo SUPER_ADMIN y ALUMNO pueden usar contraseña; Coordinador/Docente usan Google OAuth
    const canUsePassword = user?.role === 'SUPER_ADMIN' || user?.role === 'ALUMNO'
    if (!user || !user.isActive || !canUsePassword || !user.password) throw INVALID

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(429, 'ACCOUNT_LOCKED', 'Cuenta bloqueada temporalmente. Intente más tarde.')
    }

    const valid = await argon2.verify(user.password, password)

    if (!valid) {
      const newAttempts = user.failedLoginAttempts + 1
      const lock = newAttempts >= MAX_FAILED_ATTEMPTS
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          ...(lock && { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }),
        },
      })
      await auditService.log({ actorId: null, action: 'LOGIN_FAIL', entity: 'User', entityId: user.id, ip })
      throw INVALID
    }

    // Login exitoso: resetear contador
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    })

    const accessToken = signAccessToken(user.id, user.role, user.tokenVersion)
    const rawRefresh = await issueRefreshToken(user.id, ip)

    await auditService.log({ actorId: user.id, action: 'LOGIN_SUCCESS', entity: 'User', entityId: user.id, ip })

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    }
  },

  async refresh(rawToken: string, ip?: string) {
    const tokenHash = hashToken(rawToken)
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } })

    if (!stored) throw new AppError(401, 'INVALID_TOKEN', 'Token inválido')

    if (stored.revokedAt) {
      // Reuse detection: revocar todos los tokens del usuario
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      throw new AppError(401, 'TOKEN_REUSE', 'Sesión comprometida. Inicie sesión nuevamente.')
    }

    if (stored.expiresAt < new Date()) throw new AppError(401, 'TOKEN_EXPIRED', 'Sesión expirada')

    const { user } = stored
    if (!user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Usuario inactivo')

    // Rotación: revocar actual y emitir nuevo
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })
    const newRaw = await issueRefreshToken(user.id, ip)
    const accessToken = signAccessToken(user.id, user.role, user.tokenVersion)

    return { accessToken, refreshToken: newRaw }
  },

  async logout(rawToken: string, actorId?: string, ip?: string) {
    const tokenHash = hashToken(rawToken)
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    if (actorId) {
      await auditService.log({ actorId, action: 'LOGOUT', entity: 'User', entityId: actorId, ip })
    }
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, mustChangePassword: true },
    })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')
    return user
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')
    if (!user.password) throw new AppError(400, 'INVALID_OPERATION', 'Este usuario no usa contraseña')

    const valid = await argon2.verify(user.password, currentPassword)
    if (!valid) throw new AppError(400, 'INVALID_PASSWORD', 'La contraseña actual es incorrecta')

    const newHash = await argon2.hash(newPassword, { type: argon2.argon2id })
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHash, mustChangePassword: false, tokenVersion: { increment: 1 } },
    })

    await auditService.log({ actorId: userId, action: 'PASSWORD_CHANGE', entity: 'User', entityId: userId, ip })
  },

  async loginWithGoogle(googleAccessToken: string, ip?: string) {
    const client = getGoogleClient()
    let email: string
    let googleSub: string

    try {
      // getTokenInfo verifica el access token contra los servidores de Google
      const info = await client.getTokenInfo(googleAccessToken)
      if (!info.email || !info.email_verified) throw new Error('email no verificado')
      email = info.email
      googleSub = info.sub ?? info.email
    } catch {
      throw new AppError(401, 'INVALID_GOOGLE_TOKEN', 'Token de Google inválido o expirado')
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Coordinador, Docente y Alumno pueden usar Google; Super Admin usa contraseña
    const googleRoles = ['COORDINADOR', 'DOCENTE', 'ALUMNO']
    if (!user || !googleRoles.includes(user.role)) {
      await auditService.log({ actorId: null, action: 'LOGIN_FAIL_GOOGLE', ip, meta: { reason: 'not_authorized' } } as Parameters<typeof auditService.log>[0])
      throw new AppError(403, 'NOT_AUTHORIZED', 'Este correo no está autorizado. Contacta al administrador.')
    }
    if (!user.isActive) throw new AppError(401, 'ACCOUNT_INACTIVE', 'Cuenta desactivada. Contacta al administrador.')

    // Persiste googleId en el primer login con Google
    if (!user.googleId) {
      await prisma.user.update({ where: { id: user.id }, data: { googleId: googleSub } })
    }

    const accessToken = signAccessToken(user.id, user.role, user.tokenVersion)
    const rawRefresh = await issueRefreshToken(user.id, ip)

    await auditService.log({ actorId: user.id, action: 'LOGIN_SUCCESS_GOOGLE', entity: 'User', entityId: user.id, ip })

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: false },
    }
  },
}
