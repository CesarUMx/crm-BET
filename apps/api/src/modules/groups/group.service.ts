import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { logAudit } from '../../utils/audit-log'
import { assertCanManageGroup } from '../../utils/group-access'
import type { CreateGroupInput, UpdateGroupInput, Role } from 'shared'

// Un grupo "vencido" no se persiste como status: se calcula al leer (igual que la edad del alumno)
// para no depender de un job que lo actualice y no quedar nunca desincronizado.
export function isGroupExpired(endDate: Date | null): boolean {
  return endDate !== null && endDate < new Date()
}

function withExpired<T extends { endDate: Date | null }>(group: T) {
  return { ...group, isExpired: isGroupExpired(group.endDate) }
}

async function assertIsTeacher(teacherId: string): Promise<void> {
  const teacher = await prisma.user.findUnique({ where: { id: teacherId } })
  if (!teacher || teacher.role !== 'DOCENTE') {
    throw new AppError(400, 'INVALID_TEACHER', 'El usuario indicado no es un Docente válido')
  }
}

export const groupService = {
  async listTeachers() {
    return prisma.user.findMany({
      where: { role: 'DOCENTE', isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })
  },

  async listByCourse(courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) throw new AppError(404, 'NOT_FOUND', 'Curso no encontrado')

    const groups = await prisma.group.findMany({
      where: { courseId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } } },
    })
    return groups.map(withExpired)
  },

  // Portal Docente/Alumno: grupos donde el usuario da clase (Docente) o está inscrito (Alumno)
  async listMine(userId: string, role: Role) {
    const courseSelect = { select: { id: true, code: true, name: true } } as const

    if (role === 'DOCENTE') {
      const groups = await prisma.group.findMany({
        where: { teacherId: userId },
        include: { course: courseSelect },
        orderBy: { createdAt: 'desc' },
      })
      return groups.map((g) => ({ ...withExpired(g), enrollmentStatus: null as string | null }))
    }

    if (role === 'ALUMNO') {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { studentId: true } })
      if (!user?.studentId) return []

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: user.studentId, groupId: { not: null } },
        include: { group: { include: { course: courseSelect } } },
        orderBy: { enrolledAt: 'desc' },
      })
      return enrollments
        .filter((e) => e.group !== null)
        .map((e) => ({ ...withExpired(e.group!), enrollmentStatus: e.status }))
    }

    throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a esta vista')
  },

  // Roster del grupo (Docente dueño del grupo o Admin/Coordinador). Alumno NO tiene acceso
  // (no debe ver a sus compañeros); se incluyen datos suficientes para no requerir otra llamada.
  async listEnrollments(groupId: string, userId: string, role: Role) {
    await assertCanManageGroup(groupId, userId, role)

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    return prisma.enrollment.findMany({
      where: { groupId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: {
          select: { id: true, matricula: true, firstName: true, lastName: true, email: true, phone: true, birthDate: true, status: true },
        },
      },
    })
  },

  async getById(id: string) {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, code: true, name: true } },
        enrollments: {
          where: { status: 'ENROLLED' },
          include: { student: { select: { id: true, matricula: true, firstName: true, lastName: true } } },
        },
      },
    })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')
    return withExpired(group)
  },

  async create(courseId: string, data: CreateGroupInput, actorId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) throw new AppError(404, 'NOT_FOUND', 'Curso no encontrado')

    const existing = await prisma.group.findUnique({ where: { courseId_name: { courseId, name: data.name } } })
    if (existing) throw new AppError(409, 'NAME_TAKEN', `Ya existe un grupo "${data.name}" en este curso`)

    if (data.teacherId) await assertIsTeacher(data.teacherId)

    const group = await prisma.group.create({
      data: {
        courseId,
        name: data.name,
        capacity: data.capacity ?? null,
        schedule: data.schedule,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        teacherId: data.teacherId ?? null,
        onlineMeetingUrl: data.onlineMeetingUrl ?? null,
      },
    })

    await logAudit({ actorId, action: 'GROUP_CREATE', entity: 'Group', entityId: group.id, meta: { courseId, name: group.name } })
    return withExpired(group)
  },

  async update(id: string, data: UpdateGroupInput, actorId: string) {
    const group = await prisma.group.findUnique({ where: { id } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')
    if (isGroupExpired(group.endDate)) {
      throw new AppError(400, 'GROUP_EXPIRED', 'El grupo ya venció; no se puede editar')
    }

    if (data.name && data.name !== group.name) {
      const dup = await prisma.group.findUnique({ where: { courseId_name: { courseId: group.courseId, name: data.name } } })
      if (dup) throw new AppError(409, 'NAME_TAKEN', `Ya existe un grupo "${data.name}" en este curso`)
    }

    if (data.teacherId) await assertIsTeacher(data.teacherId)

    const updated = await prisma.group.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.schedule !== undefined && { schedule: data.schedule }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.teacherId !== undefined && { teacherId: data.teacherId }),
        ...(data.onlineMeetingUrl !== undefined && { onlineMeetingUrl: data.onlineMeetingUrl }),
      },
    })

    await logAudit({ actorId, action: 'GROUP_UPDATE', entity: 'Group', entityId: id })
    return withExpired(updated)
  },

  async remove(id: string, actorId: string) {
    const group = await prisma.group.findUnique({ where: { id } })
    if (!group) throw new AppError(404, 'NOT_FOUND', 'Grupo no encontrado')

    // Las inscripciones del grupo quedan sin grupo (onDelete: SetNull en el schema)
    await prisma.group.delete({ where: { id } })
    await logAudit({ actorId, action: 'GROUP_DELETE', entity: 'Group', entityId: id, meta: { name: group.name } })
  },
}

