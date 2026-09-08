import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z.string().min(1, 'El nombre del grupo es requerido'),
  // null = cupo ilimitado
  capacity: z.number().int().positive('El cupo debe ser mayor a 0').nullable().optional(),
  schedule: z.string().optional(),
  startDate: z.string().date('Fecha inválida (YYYY-MM-DD)').optional(),
  endDate: z.string().date('Fecha inválida (YYYY-MM-DD)').optional(),
  // Docente asignado al grupo; null = sin asignar
  teacherId: z.string().uuid('teacherId inválido').nullable().optional(),
  // Liga de videollamada (cursos EN_LINEA/HIBRIDO); null = sin liga
  onlineMeetingUrl: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().url('URL inválida').nullable().optional(),
  ),
})

export const updateGroupSchema = createGroupSchema.partial()

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
