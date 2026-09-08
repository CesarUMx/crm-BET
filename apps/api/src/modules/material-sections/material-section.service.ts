import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { logAudit } from '../../utils/audit-log'
import { assertCanManageGroup, assertCanViewGroup } from '../../utils/group-access'
import type { CreateMaterialSectionInput, UpdateMaterialSectionInput, Role } from 'shared'

export const materialSectionService = {
  async listByGroup(groupId: string, userId: string, role: Role) {
    await assertCanViewGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    return prisma.materialSection.findMany({
      where: { groupId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  },

  async create(groupId: string, data: CreateMaterialSectionInput, userId: string, role: Role) {
    await assertCanManageGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    const maxOrder = await prisma.materialSection.aggregate({ where: { groupId }, _max: { order: true } })

    const section = await prisma.materialSection.create({
      data: { groupId, title: data.title, order: (maxOrder._max.order ?? -1) + 1 },
    })

    await logAudit({ actorId: userId, action: 'MATERIAL_SECTION_CREATE', entity: 'MaterialSection', entityId: section.id, meta: { groupId, title: section.title } })
    return section
  },

  async update(id: string, data: UpdateMaterialSectionInput, userId: string, role: Role) {
    const section = await prisma.materialSection.findUnique({ where: { id } })
    if (!section) throw new AppError(404, 'NOT_FOUND', 'Sección no encontrada')

    await assertCanManageGroup(section.groupId, userId, role)

    const updated = await prisma.materialSection.update({
      where: { id },
      data: { ...(data.title && { title: data.title }) },
    })

    await logAudit({ actorId: userId, action: 'MATERIAL_SECTION_UPDATE', entity: 'MaterialSection', entityId: id })
    return updated
  },

  // Borrar una sección NO borra su material; queda sin sección (onDelete: SetNull en el schema)
  async remove(id: string, userId: string, role: Role) {
    const section = await prisma.materialSection.findUnique({ where: { id } })
    if (!section) throw new AppError(404, 'NOT_FOUND', 'Sección no encontrada')

    await assertCanManageGroup(section.groupId, userId, role)

    await prisma.materialSection.delete({ where: { id } })
    await logAudit({ actorId: userId, action: 'MATERIAL_SECTION_DELETE', entity: 'MaterialSection', entityId: id, meta: { groupId: section.groupId } })
  },
}
