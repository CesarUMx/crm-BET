import { prisma } from '../config/prisma'
import { AppError } from '../middlewares/error.middleware'
import type { Role } from 'shared'

/**
 * Verifica que el usuario pueda ADMINISTRAR (crear/editar/borrar) material o sesiones de un grupo.
 * Super Admin y Coordinador: todos los grupos. Docente: solo los grupos donde es teacherId.
 */
export async function assertCanManageGroup(groupId: string, userId: string, role: Role): Promise<void> {
  if (role === 'SUPER_ADMIN' || role === 'COORDINADOR') return

  if (role === 'DOCENTE') {
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { teacherId: true } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')
    if (group.teacherId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'No tienes asignado este grupo')
    }
    return
  }

  throw new AppError(403, 'FORBIDDEN', 'No tienes permisos para esta acción')
}

/**
 * Verifica que el usuario pueda LEER material/sesiones de un grupo.
 * Super Admin, Coordinador y Docente-dueño: acceso total. Alumno: solo si tiene (o tuvo)
 * una inscripción a ese grupo, incluso si el curso ya concluyó.
 */
export async function assertCanViewGroup(groupId: string, userId: string, role: Role): Promise<void> {
  if (role === 'SUPER_ADMIN' || role === 'COORDINADOR') return

  if (role === 'DOCENTE') {
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { teacherId: true } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')
    if (group.teacherId !== userId) throw new AppError(403, 'FORBIDDEN', 'No tienes asignado este grupo')
    return
  }

  if (role === 'ALUMNO') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { studentId: true } })
    if (!user?.studentId) throw new AppError(403, 'FORBIDDEN', 'Tu cuenta no está ligada a un alumno')

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: user.studentId, groupId },
    })
    if (!enrollment) throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este grupo')
    return
  }

  throw new AppError(403, 'FORBIDDEN', 'No tienes permisos para esta acción')
}
