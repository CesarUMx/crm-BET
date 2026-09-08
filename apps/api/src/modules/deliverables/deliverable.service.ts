import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { logAudit } from '../../utils/audit-log'
import { assertCanManageGroup, assertCanViewGroup } from '../../utils/group-access'
import type { CreateDeliverableInput, UpdateDeliverableInput, Role } from 'shared'

export const deliverableService = {
  async listByGroup(groupId: string, userId: string, role: Role) {
    await assertCanViewGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    return prisma.deliverable.findMany({
      where: { groupId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    })
  },

  async create(groupId: string, data: CreateDeliverableInput, userId: string, role: Role) {
    await assertCanManageGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    const deliverable = await prisma.deliverable.create({
      data: {
        groupId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdBy: userId,
      },
    })

    await logAudit({ actorId: userId, action: 'DELIVERABLE_CREATE', entity: 'Deliverable', entityId: deliverable.id, meta: { groupId, title: deliverable.title } })
    return deliverable
  },

  async update(id: string, data: UpdateDeliverableInput, userId: string, role: Role) {
    const deliverable = await prisma.deliverable.findUnique({ where: { id } })
    if (!deliverable) throw new AppError(404, 'NOT_FOUND', 'Entregable no encontrado')

    await assertCanManageGroup(deliverable.groupId, userId, role)

    const updated = await prisma.deliverable.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      },
    })

    await logAudit({ actorId: userId, action: 'DELIVERABLE_UPDATE', entity: 'Deliverable', entityId: id })
    return updated
  },

  async remove(id: string, userId: string, role: Role) {
    const deliverable = await prisma.deliverable.findUnique({ where: { id } })
    if (!deliverable) throw new AppError(404, 'NOT_FOUND', 'Entregable no encontrado')

    await assertCanManageGroup(deliverable.groupId, userId, role)

    await prisma.deliverable.delete({ where: { id } })
    await logAudit({ actorId: userId, action: 'DELIVERABLE_DELETE', entity: 'Deliverable', entityId: id, meta: { groupId: deliverable.groupId } })
  },
}
