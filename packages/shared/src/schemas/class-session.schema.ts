import { z } from 'zod'

export const createClassSessionSchema = z.object({
  date: z.string().date('Fecha inválida (YYYY-MM-DD)'),
  topic: z.string().optional(),
  recordingUrl: z.string().url('URL inválida').optional(),
  notes: z.string().optional(),
})

export const updateClassSessionSchema = createClassSessionSchema.partial()

export type CreateClassSessionInput = z.infer<typeof createClassSessionSchema>
export type UpdateClassSessionInput = z.infer<typeof updateClassSessionSchema>
