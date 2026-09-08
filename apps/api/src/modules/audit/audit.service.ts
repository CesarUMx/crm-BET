import { prisma } from '../../config/prisma'
import { logger } from '../../config/logger'
import type { Prisma } from '@prisma/client'

interface LogEvent {
  actorId: string | null
  action: string
  entity?: string
  entityId?: string
  ip?: string
  meta?: Record<string, unknown>
}

export const auditService = {
  async log(event: LogEvent) {
    try {
      // meta se castea a unknown para compatibilidad con el tipo Json de Prisma
      await prisma.auditLog.create({ data: { ...event, meta: event.meta as Prisma.InputJsonValue } })
    } catch (err) {
      // Un fallo de auditoría no debe interrumpir el flujo principal
      logger.warn({ err }, 'AuditLog: fallo al registrar evento')
    }
  },

  async list({
    actorId,
    action,
    entity,
    page = 1,
    pageSize = 20,
  }: {
    actorId?: string
    action?: string
    entity?: string
    page?: number
    pageSize?: number
  }) {
    const where = {
      ...(actorId && { actorId }),
      ...(action && { action: { contains: action, mode: 'insensitive' as const } }),
      ...(entity && { entity }),
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      data: logs,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    }
  },
}
