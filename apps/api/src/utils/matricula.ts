import { prisma } from '../config/prisma'

/**
 * Genera la matrícula única del alumno: YY + consecutivo 5 dígitos.
 * Ejemplo: alumno 1 de 2026 → "2600001"
 * Usa upsert dentro de transacción para evitar condición de carrera.
 */
export async function generarMatricula(): Promise<string> {
  const year = new Date().getFullYear() % 100 // YY (ej. 26)

  const counter = await prisma.$transaction(async (tx) => {
    return tx.matriculaCounter.upsert({
      where: { year },
      create: { year, lastNo: 1 },
      update: { lastNo: { increment: 1 } },
    })
  })

  const yy = String(year).padStart(2, '0')
  const seq = String(counter.lastNo).padStart(5, '0')
  return `${yy}${seq}`
}
