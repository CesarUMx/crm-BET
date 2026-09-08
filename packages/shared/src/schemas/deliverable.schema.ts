import { z } from 'zod'

export const createDeliverableSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  // Sin fecha = sin límite de entrega; "" desde el input date se trata como sin fecha
  dueDate: z.preprocess((v) => (v === '' ? undefined : v), z.string().date('Fecha inválida (YYYY-MM-DD)').optional()),
})

export const updateDeliverableSchema = createDeliverableSchema.partial()

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>
