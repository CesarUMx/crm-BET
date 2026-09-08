import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { logAudit } from '../../utils/audit-log'
import { assertCanManageGroup, assertCanViewGroup } from '../../utils/group-access'
import type { CreateGroupMaterialInput, Role } from 'shared'
import fs from 'fs/promises'
import path from 'path'

interface UploadedFile {
  path: string
  originalname: string
  size: number
}

export const materialService = {
  async listByGroup(groupId: string, userId: string, role: Role) {
    await assertCanViewGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    return prisma.groupMaterial.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async create(groupId: string, data: CreateGroupMaterialInput, file: UploadedFile | undefined, userId: string, role: Role) {
    await assertCanManageGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    if (data.type === 'DOCUMENT' && !file) {
      throw new AppError(400, 'FILE_REQUIRED', 'Debes subir un archivo para material tipo documento')
    }

    if (data.sectionId) {
      const section = await prisma.materialSection.findUnique({ where: { id: data.sectionId } })
      if (!section || section.groupId !== groupId) {
        throw new AppError(400, 'INVALID_SECTION', 'La sección indicada no pertenece a este grupo')
      }
    }

    const material = await prisma.groupMaterial.create({
      data: {
        groupId,
        sectionId: data.sectionId ?? null,
        title: data.title,
        type: data.type,
        fileUrl: file ? `/uploads/materials/${path.basename(file.path)}` : null,
        fileName: file?.originalname ?? null,
        fileSize: file?.size ?? null,
        externalUrl: data.type === 'LINK' ? data.externalUrl : null,
        uploadedBy: userId,
      },
    })

    await logAudit({ actorId: userId, action: 'MATERIAL_CREATE', entity: 'GroupMaterial', entityId: material.id, meta: { groupId, title: material.title } })
    return material
  },

  async remove(id: string, userId: string, role: Role) {
    const material = await prisma.groupMaterial.findUnique({ where: { id } })
    if (!material) throw new AppError(404, 'NOT_FOUND', 'Material no encontrado')

    await assertCanManageGroup(material.groupId, userId, role)

    // Borra el archivo físico si existe (no falla la operación si ya no está en disco)
    if (material.fileUrl) {
      const filePath = path.join(process.cwd(), 'uploads', 'materials', path.basename(material.fileUrl))
      await fs.unlink(filePath).catch(() => undefined)
    }

    await prisma.groupMaterial.delete({ where: { id } })
    await logAudit({ actorId: userId, action: 'MATERIAL_DELETE', entity: 'GroupMaterial', entityId: id, meta: { groupId: material.groupId, title: material.title } })
  },

  // Usado por el endpoint de descarga para validar acceso antes de servir el archivo
  async getForDownload(id: string, userId: string, role: Role) {
    const material = await prisma.groupMaterial.findUnique({ where: { id } })
    if (!material) throw new AppError(404, 'NOT_FOUND', 'Material no encontrado')
    if (material.type !== 'DOCUMENT' || !material.fileUrl) {
      throw new AppError(400, 'NOT_DOWNLOADABLE', 'Este material no tiene archivo para descargar')
    }
    await assertCanViewGroup(material.groupId, userId, role)
    return material
  },
}
