import 'dotenv/config'
import { z } from 'zod'

// z.coerce.boolean() usa Boolean(v): cualquier string no vacío (incluido "false") da true.
// Este preprocesador sí distingue el texto "false"/"0" de valores verdaderos.
const booleanFromEnv = z.preprocess((v) => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return !['false', '0', ''].includes(v.toLowerCase())
  return v
}, z.boolean())

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_ISSUER: z.string().default('umx-control-alumnos'),
  JWT_AUDIENCE: z.string().default('umx-control-alumnos-api'),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  // SMTP para correos transaccionales (contraseña temporal de Alumno, etc.). Si no se
  // configura, el envío se omite silenciosamente (se loguea un warning) sin romper el flujo.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanFromEnv.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Variables de entorno inválidas:')
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2))
  process.exit(1)
}

export const env = parsed.data
