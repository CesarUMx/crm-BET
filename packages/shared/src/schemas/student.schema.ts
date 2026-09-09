import { z } from 'zod'

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  // YYYY-MM-DD; la edad se deriva de este campo al leer
  birthDate: z.string().date('Fecha inválida (YYYY-MM-DD)'),
})

export const updateStudentSchema = createStudentSchema.partial()

export const activateAccessBulkSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos un alumno'),
})

export type CreateStudentInput = z.infer<typeof createStudentSchema>
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>
export type ActivateAccessBulkInput = z.infer<typeof activateAccessBulkSchema>
