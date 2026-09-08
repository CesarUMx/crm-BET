import { z } from 'zod'

// El archivo en sí (fileUrl/fileName/fileSize) lo agrega multer en el backend, no viene en el body
export const createGroupMaterialSchema = z
  .object({
    title: z.string().min(1, 'El título es requerido'),
    type: z.enum(['DOCUMENT', 'LINK']),
    externalUrl: z.string().url('URL inválida').optional(),
    // Sección opcional (agrupador temático); "" desde el <select> se trata como sin sección
    sectionId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  })
  .refine((d) => d.type !== 'LINK' || !!d.externalUrl, {
    message: 'La URL es requerida cuando el tipo es enlace externo',
    path: ['externalUrl'],
  })

export type CreateGroupMaterialInput = z.infer<typeof createGroupMaterialSchema>

export const createMaterialSectionSchema = z.object({
  title: z.string().min(1, 'El título de la sección es requerido'),
})

export const updateMaterialSectionSchema = createMaterialSectionSchema.partial()

export type CreateMaterialSectionInput = z.infer<typeof createMaterialSectionSchema>
export type UpdateMaterialSectionInput = z.infer<typeof updateMaterialSectionSchema>
