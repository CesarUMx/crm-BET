import nodemailer from 'nodemailer'
import { env } from '../config/env'
import { logger } from '../config/logger'

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null

// Si no hay SMTP configurado, se omite el envío sin romper el flujo que lo dispara (ej. activar acceso)
async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    logger.warn({ to, subject }, 'SMTP no configurado: correo no enviado')
    return
  }
  try {
    await transporter.sendMail({ from: env.SMTP_FROM ?? env.SMTP_USER, to, subject, html })
  } catch (err) {
    logger.error({ err, to, subject }, 'Error al enviar correo')
  }
}

export async function sendTempPasswordEmail(to: string, name: string, tempPassword: string): Promise<void> {
  await sendMail(
    to,
    'Acceso al sistema de Control de Alumnos — UMx',
    `
      <p>Hola ${name},</p>
      <p>Se activó tu acceso al sistema de Control de Alumnos de Universidad Mondragón UMx.</p>
      <p>Tu contraseña temporal es: <strong>${tempPassword}</strong></p>
      <p>Al iniciar sesión por primera vez se te pedirá cambiarla.</p>
    `,
  )
}
