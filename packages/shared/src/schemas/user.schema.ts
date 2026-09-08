import { z } from 'zod'

// ALUMNO se maneja aparte (se liga a un Student existente), no en el CRUD genérico de usuarios
const roleEnum = z.enum(['SUPER_ADMIN', 'COORDINADOR', 'DOCENTE'])

const passwordSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')

export const createUserSchema = z
  .object({
    email: z.string().email('Email inválido'),
    name: z.string().min(1, 'El nombre es requerido'),
    role: roleEnum,
    // Solo requerida para SUPER_ADMIN; Coordinador y Docente usan Google. Convierte "" a undefined.
    password: z.preprocess((v) => (v === '' ? undefined : v), passwordSchema.optional()),
  })
  .refine((d) => d.role !== 'SUPER_ADMIN' || !!d.password, {
    message: 'La contraseña es requerida para Super Admin',
    path: ['password'],
  })

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: roleEnum.optional(),
  isActive: z.boolean().optional(),
})

export const resetPasswordSchema = z.object({
  password: passwordSchema,
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
