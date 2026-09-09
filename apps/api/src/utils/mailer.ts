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
  logger.info({ to, subject, host: env.SMTP_HOST }, 'Enviando correo…')
  try {
    const info = await transporter.sendMail({ from: env.SMTP_FROM ?? env.SMTP_USER, to, subject, html })
    logger.info({ to, subject, messageId: info.messageId, response: info.response }, 'Correo enviado')
  } catch (err) {
    logger.error({ err, to, subject }, 'Error al enviar correo')
  }
}

export async function sendTempPasswordEmail(to: string, name: string, tempPassword: string): Promise<void> {
  const siteUrl = env.CORS_ORIGIN
  const loginUrl = `${siteUrl}/login`
  const logoUrl = `${siteUrl}/logo-mark-512.png`

  await sendMail(
    to,
    'Acceso al sistema de Control de Alumnos — UMx',
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;font-family:Segoe UI,Arial,sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#004A87,#006EBF);padding:28px 24px;">
                  <img src="${logoUrl}" alt="UMx BET" width="64" height="64" style="display:block;border-radius:12px;background:#ffffff;padding:6px;" />
                  <p style="margin:12px 0 0;color:#ffffff;font-size:16px;font-weight:bold;">Control de Alumnos — UMx BET</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;color:#1e293b;font-size:14px;line-height:1.6;">
                  <p style="margin:0 0 12px;">Hola <strong>${name}</strong>,</p>
                  <p style="margin:0 0 16px;">Se activó tu acceso al portal del alumno de Universidad Mondragón México.</p>
                  <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Tu contraseña temporal</p>
                  <p style="margin:0 0 20px;background:#f1f5f9;border-radius:8px;padding:12px 16px;font-family:Consolas,monospace;font-size:18px;font-weight:bold;letter-spacing:.05em;color:#004A87;">${tempPassword}</p>
                  <p style="margin:0 0 20px;">Al iniciar sesión por primera vez se te pedirá cambiarla por una de tu elección.</p>
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="background:#E9511D;border-radius:24px;">
                        <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:14px;">Iniciar sesión</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:24px 0 0;padding:12px 16px;background:#eff6ff;border-radius:8px;font-size:13px;color:#1e3a5f;">
                    💡 Si tu correo es una cuenta institucional de Universidad Mondragón México, también puedes ingresar directamente con <strong>Google</strong>, sin necesidad de esta contraseña.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:16px;color:#94a3b8;font-size:11px;">© 2026 Universidad Mondragón UMx</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  )
}
