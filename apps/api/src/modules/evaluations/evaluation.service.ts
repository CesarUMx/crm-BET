import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { logAudit } from '../../utils/audit-log'
import { assertCanManageGroup, assertCanViewGroup } from '../../utils/group-access'
import type { CreateEvaluationInput, UpdateEvaluationInput, Role } from 'shared'

export const evaluationService = {
  async listByGroup(groupId: string, userId: string, role: Role) {
    await assertCanViewGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    return prisma.evaluation.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async create(groupId: string, data: CreateEvaluationInput, userId: string, role: Role) {
    await assertCanManageGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    const evaluation = await prisma.evaluation.create({
      data: {
        groupId,
        title: data.title,
        description: data.description,
        externalUrl: data.externalUrl,
        createdBy: userId,
      },
    })

    await logAudit({ actorId: userId, action: 'EVALUATION_CREATE', entity: 'Evaluation', entityId: evaluation.id, meta: { groupId, title: evaluation.title } })
    return evaluation
  },

  async update(id: string, data: UpdateEvaluationInput, userId: string, role: Role) {
    const evaluation = await prisma.evaluation.findUnique({ where: { id } })
    if (!evaluation) throw new AppError(404, 'NOT_FOUND', 'Evaluación no encontrada')

    await assertCanManageGroup(evaluation.groupId, userId, role)

    const updated = await prisma.evaluation.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.externalUrl !== undefined && { externalUrl: data.externalUrl }),
      },
    })

    await logAudit({ actorId: userId, action: 'EVALUATION_UPDATE', entity: 'Evaluation', entityId: id })
    return updated
  },

  async remove(id: string, userId: string, role: Role) {
    const evaluation = await prisma.evaluation.findUnique({ where: { id } })
    if (!evaluation) throw new AppError(404, 'NOT_FOUND', 'Evaluación no encontrada')

    await assertCanManageGroup(evaluation.groupId, userId, role)

    await prisma.evaluation.delete({ where: { id } })
    await logAudit({ actorId: userId, action: 'EVALUATION_DELETE', entity: 'Evaluation', entityId: id, meta: { groupId: evaluation.groupId } })
  },
}
