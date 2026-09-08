import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const changePasswordSchema = z.object({
  current: z.string().min(1, 'La contraseña actual es requerida'),
  next: z
    .string()
    .min(12, 'La nueva contraseña debe tener al menos 12 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
