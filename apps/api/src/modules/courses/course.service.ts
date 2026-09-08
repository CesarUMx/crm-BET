import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { logAudit } from '../../utils/audit-log'
import type { CreateCourseInput, UpdateCourseInput } from 'shared'

export const courseService = {
  async list(params: { search?: string; type?: string; status?: string; page?: number; pageSize?: number }) {
    const { search, type, status, page = 1, pageSize = 20 } = params

    const where = {
      ...(type && { type: type as 'CURSO' | 'DIPLOMADO' }),
      ...(status && { status: status as 'OPEN' | 'CLOSED' | 'ARCHIVED' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, code: true, name: true, type: true, modality: true,
          status: true, createdAt: true,
          _count: { select: { enrollments: true, groups: true } },
        },
      }),
      prisma.course.count({ where }),
    ])

    return { courses, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  async getById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        groups: { orderBy: { name: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    })
    if (!course) throw new AppError(404, 'NOT_FOUND', 'Curso no encontrado')
    // seq es campo interno (generación de folios); no se expone
    const { seq: _seq, ...rest } = course
    return rest
  },

  async create(data: CreateCourseInput, actorId: string) {
    const existing = await prisma.course.findUnique({ where: { code: data.code } })
    if (existing) throw new AppError(409, 'CODE_TAKEN', `Ya existe un curso con la clave "${data.code}"`)

    const course = await prisma.course.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        type: data.type ?? 'CURSO',
        modality: data.modality ?? 'PRESENCIAL',
        hours: data.hours,
        duration: data.duration,
        requirements: data.requirements,
      },
      select: { id: true, code: true, name: true, type: true, modality: true, status: true },
    })

    await logAudit({ actorId, action: 'COURSE_CREATE', entity: 'Course', entityId: course.id, meta: { code: course.code } })
    return course
  },

  async update(id: string, data: UpdateCourseInput, actorId: string) {
    const course = await prisma.course.findUnique({ where: { id } })
    if (!course) throw new AppError(404, 'NOT_FOUND', 'Curso no encontrado')
    if (course.status === 'ARCHIVED') throw new AppError(400, 'ARCHIVED', 'No se puede editar un curso archivado')

    // Archivar vía update debe respetar la misma regla que el endpoint dedicado de archivar
    if (data.status === 'ARCHIVED') {
      const activeCount = await prisma.enrollment.count({ where: { courseId: id, status: 'ENROLLED' } })
      if (activeCount > 0) {
        throw new AppError(409, 'HAS_ACTIVE_ENROLLMENTS', 'No se puede archivar un curso con inscripciones activas')
      }
    }

    if (data.code && data.code !== course.code) {
      const dup = await prisma.course.findUnique({ where: { code: data.code } })
      if (dup) throw new AppError(409, 'CODE_TAKEN', `Ya existe un curso con la clave "${data.code}"`)
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.modality && { modality: data.modality }),
        ...(data.hours !== undefined && { hours: data.hours }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.requirements !== undefined && { requirements: data.requirements }),
        ...(data.status && { status: data.status }),
      },
      select: { id: true, code: true, name: true, type: true, modality: true, status: true },
    })

    await logAudit({ actorId, action: 'COURSE_UPDATE', entity: 'Course', entityId: id })
    return updated
  },

  async archive(id: string, actorId: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } } },
    })
    if (!course) throw new AppError(404, 'NOT_FOUND', 'Curso no encontrado')
    if (course._count.enrollments > 0) {
      throw new AppError(409, 'HAS_ACTIVE_ENROLLMENTS', 'No se puede archivar un curso con inscripciones activas')
    }

    await prisma.course.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await logAudit({ actorId, action: 'COURSE_ARCHIVE', entity: 'Course', entityId: id })
  },
}
