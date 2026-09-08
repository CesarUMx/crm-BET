import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { generarFolio } from '../../utils/folio'
import { logAudit } from '../../utils/audit-log'
import { isGroupExpired } from '../groups/group.service'
import type { Prisma } from '@prisma/client'
import type { CreateEnrollmentInput, UpdateEnrollmentStatusInput } from 'shared'

const selectDetail = {
  id: true,
  folio: true,
  status: true,
  enrolledAt: true,
  student: { select: { id: true, matricula: true, firstName: true, lastName: true } },
  course: { select: { id: true, code: true, name: true, type: true } },
  group: { select: { id: true, name: true } },
} as const

// Verifica cupo del grupo dentro de una transacción para evitar condición de carrera
async function assertGroupHasCapacity(tx: Prisma.TransactionClient, groupId: string, excludeEnrollmentId?: string) {
  const group = await tx.group.findUnique({ where: { id: groupId } })
  if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')
  if (group.capacity === null) return // cupo ilimitado

  const count = await tx.enrollment.count({
    where: {
      groupId,
      status: 'ENROLLED',
      ...(excludeEnrollmentId && { id: { not: excludeEnrollmentId } }),
    },
  })
  if (count >= group.capacity) {
    throw new AppError(409, 'GROUP_FULL', `El grupo "${group.name}" ya alcanzó su cupo máximo`)
  }
}

export const enrollmentService = {
  async list(params: { courseId?: string; groupId?: string; studentId?: string; page?: number; pageSize?: number }) {
    const { courseId, groupId, studentId, page = 1, pageSize = 20 } = params
    const where = {
      ...(courseId && { courseId }),
      ...(groupId && { groupId }),
      ...(studentId && { studentId }),
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { enrolledAt: 'desc' },
        select: selectDetail,
      }),
      prisma.enrollment.count({ where }),
    ])

    return { enrollments, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  async create(data: CreateEnrollmentInput, actorId: string) {
    const [student, course] = await Promise.all([
      prisma.student.findUnique({ where: { id: data.studentId } }),
      prisma.course.findUnique({ where: { id: data.courseId } }),
    ])
    if (!student) throw new AppError(404, 'NOT_FOUND', 'Alumno no encontrado')
    if (student.status === 'INACTIVE') throw new AppError(400, 'STUDENT_INACTIVE', 'El alumno está dado de baja')
    if (!course) throw new AppError(404, 'NOT_FOUND', 'Curso no encontrado')
    if (course.status !== 'OPEN') throw new AppError(400, 'COURSE_NOT_OPEN', 'El curso no está abierto a inscripciones')

    // No permitir dos inscripciones ACTIVAS del mismo alumno-curso
    const activeDup = await prisma.enrollment.findFirst({
      where: { studentId: data.studentId, courseId: data.courseId, status: 'ENROLLED' },
    })
    if (activeDup) throw new AppError(409, 'ALREADY_ENROLLED', 'El alumno ya tiene una inscripción activa en este curso')

    if (data.groupId) {
      const group = await prisma.group.findUnique({ where: { id: data.groupId } })
      if (!group || group.courseId !== data.courseId) {
        throw new AppError(400, 'INVALID_GROUP', 'El grupo no pertenece a este curso')
      }
      if (isGroupExpired(group.endDate)) {
        throw new AppError(400, 'GROUP_EXPIRED', `El grupo "${group.name}" ya venció y no admite nuevas inscripciones`)
      }
    }

    const folio = await generarFolio(course.seq)

    const enrollment = await prisma.$transaction(async (tx) => {
      if (data.groupId) await assertGroupHasCapacity(tx, data.groupId)
      return tx.enrollment.create({
        data: {
          folio,
          studentId: data.studentId,
          courseId: data.courseId,
          groupId: data.groupId,
        },
        select: selectDetail,
      })
    })

    await logAudit({ actorId, action: 'ENROLLMENT_CREATE', entity: 'Enrollment', entityId: enrollment.id, meta: { folio } })
    return enrollment
  },

  async assignGroup(id: string, groupId: string, actorId: string) {
    const enrollment = await prisma.enrollment.findUnique({ where: { id } })
    if (!enrollment) throw new AppError(404, 'NOT_FOUND', 'Inscripción no encontrada')

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group || group.courseId !== enrollment.courseId) {
      throw new AppError(400, 'INVALID_GROUP', 'El grupo no pertenece al curso de esta inscripción')
    }
    if (isGroupExpired(group.endDate)) {
      throw new AppError(400, 'GROUP_EXPIRED', `El grupo "${group.name}" ya venció y no admite nuevas asignaciones`)
    }

    const updated = await prisma.$transaction(async (tx) => {
      await assertGroupHasCapacity(tx, groupId, id)
      return tx.enrollment.update({ where: { id }, data: { groupId }, select: selectDetail })
    })

    await logAudit({ actorId, action: 'ENROLLMENT_GROUP_ASSIGN', entity: 'Enrollment', entityId: id, meta: { groupId } })
    return updated
  },

  async updateStatus(id: string, data: UpdateEnrollmentStatusInput, actorId: string) {
    const enrollment = await prisma.enrollment.findUnique({ where: { id } })
    if (!enrollment) throw new AppError(404, 'NOT_FOUND', 'Inscripción no encontrada')

    const updated = await prisma.enrollment.update({
      where: { id },
      data: { status: data.status },
      select: selectDetail,
    })

    await logAudit({ actorId, action: 'ENROLLMENT_STATUS_CHANGE', entity: 'Enrollment', entityId: id, meta: { status: data.status } })
    return updated
  },

  // Borrado físico: solo para corregir errores de captura, no para dar de baja
  async remove(id: string, actorId: string) {
    const enrollment = await prisma.enrollment.findUnique({ where: { id } })
    if (!enrollment) throw new AppError(404, 'NOT_FOUND', 'Inscripción no encontrada')

    await prisma.enrollment.delete({ where: { id } })
    await logAudit({ actorId, action: 'ENROLLMENT_DELETE', entity: 'Enrollment', entityId: id, meta: { folio: enrollment.folio } })
  },
}
