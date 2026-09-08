import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { generarMatricula } from '../../utils/matricula'
import { logAudit } from '../../utils/audit-log'
import { sendTempPasswordEmail } from '../../utils/mailer'
import crypto from 'crypto'
import * as argon2 from 'argon2'
import type { CreateStudentInput, UpdateStudentInput } from 'shared'

function calcularEdad(birthDate: Date): number {
  const hoy = new Date()
  let edad = hoy.getFullYear() - birthDate.getFullYear()
  const m = hoy.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < birthDate.getDate())) edad--
  return edad
}

function formatearAlumno(s: {
  id: string; matricula: string; firstName: string; lastName: string
  email: string; phone: string; birthDate: Date; status: string
  createdAt: Date; updatedAt: Date
}) {
  return { ...s, age: calcularEdad(s.birthDate) }
}

export const studentService = {
  async list(params: { search?: string; page?: number; pageSize?: number; status?: string }) {
    const { search, page = 1, pageSize = 20, status } = params

    const where = {
      ...(status && { status: status as 'ACTIVE' | 'INACTIVE' }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { matricula: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.student.count({ where }),
    ])

    return {
      students: students.map(formatearAlumno),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  },

  async getById(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: { course: { select: { id: true, code: true, name: true, type: true } }, group: { select: { id: true, name: true } } },
          orderBy: { enrolledAt: 'desc' },
        },
        user: { select: { id: true, isActive: true } },
      },
    })
    if (!student) throw new AppError(404, 'NOT_FOUND', 'Alumno no encontrado')
    return formatearAlumno(student)
  },

  async create(data: CreateStudentInput, actorId: string) {
    const existing = await prisma.student.findUnique({ where: { email: data.email } })
    if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'Ya existe un alumno con este correo')

    const matricula = await generarMatricula()

    const student = await prisma.student.create({
      data: {
        matricula,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        birthDate: new Date(data.birthDate),
      },
    })

    await logAudit({ actorId, action: 'STUDENT_CREATE', entity: 'Student', entityId: student.id, meta: { matricula } })
    return formatearAlumno(student)
  },

  async update(id: string, data: UpdateStudentInput, actorId: string) {
    const student = await prisma.student.findUnique({ where: { id } })
    if (!student) throw new AppError(404, 'NOT_FOUND', 'Alumno no encontrado')
    if (student.status === 'INACTIVE') throw new AppError(400, 'INACTIVE_STUDENT', 'No se puede editar un alumno dado de baja')

    if (data.email && data.email !== student.email) {
      const dup = await prisma.student.findUnique({ where: { email: data.email } })
      if (dup) throw new AppError(409, 'EMAIL_TAKEN', 'Ya existe un alumno con este correo')
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.birthDate && { birthDate: new Date(data.birthDate) }),
      },
    })

    await logAudit({ actorId, action: 'STUDENT_UPDATE', entity: 'Student', entityId: id })
    return formatearAlumno(updated)
  },

  async deactivate(id: string, actorId: string) {
    const student = await prisma.student.findUnique({ where: { id } })
    if (!student) throw new AppError(404, 'NOT_FOUND', 'Alumno no encontrado')
    if (student.status === 'INACTIVE') throw new AppError(400, 'ALREADY_INACTIVE', 'El alumno ya está dado de baja')

    // Al desactivar al alumno, sus inscripciones activas pasan a WITHDRAWN
    // (libera el cupo del grupo). Todo en una transacción para evitar inconsistencias.
    const withdrawnCount = await prisma.$transaction(async (tx) => {
      const { count } = await tx.enrollment.updateMany({
        where: { studentId: id, status: 'ENROLLED' },
        data: { status: 'WITHDRAWN' },
      })
      await tx.student.update({ where: { id }, data: { status: 'INACTIVE' } })
      return count
    })

    await logAudit({ actorId, action: 'STUDENT_DEACTIVATE', entity: 'Student', entityId: id, meta: { withdrawnEnrollments: withdrawnCount } })
  },

  async activate(id: string, actorId: string) {
    const student = await prisma.student.findUnique({ where: { id } })
    if (!student) throw new AppError(404, 'NOT_FOUND', 'Alumno no encontrado')
    if (student.status === 'ACTIVE') throw new AppError(400, 'ALREADY_ACTIVE_STUDENT', 'El alumno ya está activo')

    await prisma.student.update({ where: { id }, data: { status: 'ACTIVE' } })
    await logAudit({ actorId, action: 'STUDENT_ACTIVATE', entity: 'Student', entityId: id })
  },

  // Da de alta la cuenta de acceso (rol ALUMNO) ligada a este registro Student.
  // El alumno podrá luego entrar con esta contraseña temporal O con Google (si su correo coincide).
  async activateAccess(id: string, actorId: string) {
    const student = await prisma.student.findUnique({ where: { id }, include: { user: true } })
    if (!student) throw new AppError(404, 'NOT_FOUND', 'Alumno no encontrado')
    if (student.user) throw new AppError(409, 'ALREADY_ACTIVE', 'Este alumno ya tiene una cuenta de acceso')

    const existingEmail = await prisma.user.findUnique({ where: { email: student.email } })
    if (existingEmail) throw new AppError(409, 'EMAIL_TAKEN', 'Ya existe un usuario con este correo') 

    const tempPassword = crypto.randomBytes(8).toString('hex')
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id })

    const user = await prisma.user.create({
      data: {
        email: student.email,
        name: `${student.firstName} ${student.lastName}`,
        role: 'ALUMNO',
        password: passwordHash,
        mustChangePassword: true,
        studentId: student.id,
      },
    })

    await logAudit({ actorId, action: 'STUDENT_ACCESS_ACTIVATE', entity: 'User', entityId: user.id, meta: { studentId: student.id } })
    await sendTempPasswordEmail(student.email, `${student.firstName} ${student.lastName}`, tempPassword)
    return { tempPassword }
  },
}
