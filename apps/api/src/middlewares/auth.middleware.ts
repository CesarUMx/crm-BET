import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { AppError } from './error.middleware'
import type { Role } from 'shared'

// Extiende el tipo Request de Express con los datos del usuario autenticado
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: Role
        tokenVersion: number
      }
    }
  }
}

interface JwtPayload {
  sub: string
  role: Role
  tokenVersion: number
  iat: number
  exp: number
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Token requerido')
    }

    const token = authHeader.slice(7)
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as JwtPayload

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, tokenVersion: true, isActive: true },
    })

    if (!user || !user.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'Usuario inactivo o no encontrado')
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new AppError(401, 'TOKEN_REVOKED', 'Sesión revocada')
    }

    req.user = { id: user.id, role: user.role, tokenVersion: user.tokenVersion }
    next()
  } catch (err) {
    if (err instanceof AppError) {
      next(err)
      return
    }
    next(new AppError(401, 'UNAUTHORIZED', 'Token inválido o expirado'))
  }
}

export function requireRole(roles: Role | Role[]) {
  const allowed = Array.isArray(roles) ? roles : [roles]
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'No autenticado'))
      return
    }
    if (!allowed.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'No tienes permisos para esta acción'))
      return
    }
    next()
  }
}

// Roles con acceso administrativo pleno (gestión de alumnos/cursos/grupos/inscripciones)
export const requireStaff = requireRole(['SUPER_ADMIN', 'COORDINADOR'])
