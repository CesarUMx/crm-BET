import crypto from 'crypto'
import * as argon2 from 'argon2'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { auditService } from '../audit/audit.service'
import type { CreateUserInput, UpdateUserInput, CreateDocenteInput } from 'shared'

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export { listQuerySchema as userListQuerySchema }

export const userService = {
  async list(rawQuery: unknown) {
    const { search, page, pageSize } = listQuerySchema.parse(rawQuery)

    // ALUMNO se gestiona desde el módulo de Alumnos (activar acceso), no aquí
    const where = {
      role: { not: 'ALUMNO' as const },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where }),
    ])

    return { data: users, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  },

  async create(data: CreateUserInput, actorId: string, ip?: string) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'El email ya está en uso')

    // Coordinadores no tienen contraseña (autentican con Google)
    const passwordHash = data.role === 'SUPER_ADMIN' && data.password
      ? await argon2.hash(data.password, { type: argon2.argon2id })
      : null

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        password: passwordHash,
        mustChangePassword: data.role === 'SUPER_ADMIN',
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    await auditService.log({
      actorId,
      action: 'USER_CREATE',
      entity: 'User',
      entityId: user.id,
      ip,
      meta: { role: data.role },
    })

    return user
  },

  async update(id: string, data: UpdateUserInput, actorId: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')

    if (actorId === id && data.isActive === false) {
      throw new AppError(400, 'CANNOT_SELF_DEACTIVATE', 'No puedes desactivarte a ti mismo')
    }

    // Proteger al último Super Admin activo
    if (user.role === 'SUPER_ADMIN') {
      const willLoseRole = data.role === 'COORDINADOR'
      const willDeactivate = data.isActive === false
      if (willLoseRole || willDeactivate) {
        const count = await prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } })
        if (count <= 1) {
          throw new AppError(400, 'LAST_SUPER_ADMIN', 'No se puede modificar al último Super Admin activo')
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isActive !== undefined && {
          isActive: data.isActive,
          // Revocar tokens si se desactiva
          ...(data.isActive === false && { tokenVersion: { increment: 1 } }),
        }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, updatedAt: true },
    })

    const action = data.role && data.role !== user.role ? 'USER_ROLE_CHANGE' : 'USER_UPDATE'
    await auditService.log({
      actorId,
      action,
      entity: 'User',
      entityId: id,
      ip,
      meta: data.role && data.role !== user.role ? { from: user.role, to: data.role } : undefined,
    })

    return updated
  },

  async resetPassword(id: string, actorId: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')
    if (user.role !== 'SUPER_ADMIN') {
      throw new AppError(400, 'NO_PASSWORD_AUTH', 'Este usuario inicia sesión con Google y no tiene contraseña')
    }

    const tempPassword = crypto.randomBytes(8).toString('hex') // 16 chars hex
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id })

    await prisma.user.update({
      where: { id },
      data: { password: passwordHash, mustChangePassword: true, tokenVersion: { increment: 1 } },
    })

    await auditService.log({ actorId, action: 'PASSWORD_RESET', entity: 'User', entityId: id, ip })

    return { tempPassword }
  },

  async deactivate(id: string, actorId: string, ip?: string) {
    if (actorId === id) {
      throw new AppError(400, 'CANNOT_SELF_DEACTIVATE', 'No puedes desactivarte a ti mismo')
    }
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')

    if (user.role === 'SUPER_ADMIN') {
      const count = await prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } })
      if (count <= 1) {
        throw new AppError(400, 'LAST_SUPER_ADMIN', 'No se puede desactivar al último Super Admin activo')
      }
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    })

    await auditService.log({ actorId, action: 'USER_DELETE', entity: 'User', entityId: id, ip })
  },

  // ─── Alta rápida de Docentes (Coordinador y Super Admin) ──────────────────
  // Scope reducido a prueba de escalada de privilegios: solo lista/crea/desactiva rol DOCENTE

  async listDocentes(rawQuery: unknown) {
    const { search, page, pageSize } = listQuerySchema.parse(rawQuery)

    const where = {
      role: 'DOCENTE' as const,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where }),
    ])

    return { data: users, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  },

  async createDocente(data: CreateDocenteInput, actorId: string, ip?: string) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'El email ya está en uso')

    const user = await prisma.user.create({
      data: { email: data.email, name: data.name, role: 'DOCENTE', password: null, mustChangePassword: false },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    await auditService.log({ actorId, action: 'USER_CREATE', entity: 'User', entityId: user.id, ip, meta: { role: 'DOCENTE' } })

    return user
  },

  async deactivateDocente(id: string, actorId: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id } })
    // 404 también si no es Docente: evita que Coordinador descubra/afecte cuentas de otros roles
    if (!user || user.role !== 'DOCENTE') throw new AppError(404, 'NOT_FOUND', 'Docente no encontrado')

    await prisma.user.update({ where: { id }, data: { isActive: false, tokenVersion: { increment: 1 } } })

    await auditService.log({ actorId, action: 'USER_DELETE', entity: 'User', entityId: id, ip })
  },
}
