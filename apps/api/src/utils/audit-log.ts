import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { logger } from '../config/logger'

interface AuditParams {
  actorId?: string | null
  action: string
  entity?: string
  entityId?: string
  ip?: string
  meta?: Prisma.InputJsonValue
}

// Las fallas de auditoría no deben interrumpir el flujo principal
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({ data: params })
  } catch (err) {
    logger.warn({ err }, 'Failed to write audit log')
  }
}
