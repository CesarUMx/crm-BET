import { z } from 'zod'

export const createEvaluationSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  externalUrl: z.string().url('URL inválida (liga de Google Forms o Microsoft Forms)'),
})

export const updateEvaluationSchema = createEvaluationSchema.partial()

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>
export type UpdateEvaluationInput = z.infer<typeof updateEvaluationSchema>
