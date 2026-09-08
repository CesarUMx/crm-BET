import { z } from 'zod'

const enrollmentStatusEnum = z.enum(['ENROLLED', 'WITHDRAWN', 'COMPLETED'])

export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid('studentId inválido'),
  courseId: z.string().uuid('courseId inválido'),
  groupId: z.string().uuid('groupId inválido').optional(),
})

export const assignGroupSchema = z.object({
  groupId: z.string().uuid('groupId inválido'),
})

export const updateEnrollmentStatusSchema = z.object({
  status: enrollmentStatusEnum,
})

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>
export type AssignGroupInput = z.infer<typeof assignGroupSchema>
export type UpdateEnrollmentStatusInput = z.infer<typeof updateEnrollmentStatusSchema>
