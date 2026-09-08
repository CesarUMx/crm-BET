import { z } from 'zod'

const courseTypeEnum = z.enum(['CURSO', 'DIPLOMADO'])
const modalityEnum = z.enum(['PRESENCIAL', 'EN_LINEA', 'HIBRIDO'])
const courseStatusEnum = z.enum(['OPEN', 'CLOSED', 'ARCHIVED'])

export const createCourseSchema = z.object({
  code: z.string().min(1, 'La clave del curso es requerida'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  type: courseTypeEnum.default('CURSO'),
  modality: modalityEnum.default('PRESENCIAL'),
  // Campos extra para DIPLOMADO (opcionales en CURSO)
  hours: z.number().int().positive().optional(),
  duration: z.string().optional(),
  requirements: z.string().optional(),
})

export const updateCourseSchema = createCourseSchema
  .extend({ status: courseStatusEnum.optional() })
  .partial()

export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
