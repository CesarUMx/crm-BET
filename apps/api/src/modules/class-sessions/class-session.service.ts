import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { logAudit } from '../../utils/audit-log'
import { assertCanManageGroup, assertCanViewGroup } from '../../utils/group-access'
import type { CreateClassSessionInput, UpdateClassSessionInput, Role } from 'shared'

export const classSessionService = {
  async listByGroup(groupId: string, userId: string, role: Role) {
    await assertCanViewGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    return prisma.classSession.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
    })
  },

  async create(groupId: string, data: CreateClassSessionInput, userId: string, role: Role) {
    await assertCanManageGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    const session = await prisma.classSession.create({
      data: {
        groupId,
        date: new Date(data.date),
        topic: data.topic,
        recordingUrl: data.recordingUrl,
        notes: data.notes,
        createdBy: userId,
      },
    })

    await logAudit({ actorId: userId, action: 'SESSION_CREATE', entity: 'ClassSession', entityId: session.id, meta: { groupId } })
    return session
  },

  async update(id: string, data: UpdateClassSessionInput, userId: string, role: Role) {
    const session = await prisma.classSession.findUnique({ where: { id } })
    if (!session) throw new AppError(404, 'NOT_FOUND', 'Sesión no encontrada')

    await assertCanManageGroup(session.groupId, userId, role)

    const updated = await prisma.classSession.update({
      where: { id },
      data: {
        ...(data.date && { date: new Date(data.date) }),
        ...(data.topic !== undefined && { topic: data.topic }),
        ...(data.recordingUrl !== undefined && { recordingUrl: data.recordingUrl }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })

    await logAudit({ actorId: userId, action: 'SESSION_UPDATE', entity: 'ClassSession', entityId: id })
    return updated
  },

  async remove(id: string, userId: string, role: Role) {
    const session = await prisma.classSession.findUnique({ where: { id } })
    if (!session) throw new AppError(404, 'NOT_FOUND', 'Sesión no encontrada')

    await assertCanManageGroup(session.groupId, userId, role)

    await prisma.classSession.delete({ where: { id } })
    await logAudit({ actorId: userId, action: 'SESSION_DELETE', entity: 'ClassSession', entityId: id, meta: { groupId: session.groupId } })
  },
}
