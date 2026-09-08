import { prisma } from '../config/prisma'

/**
 * Genera el folio de inscripción: YYMM-CCC-NNNN (con guiones).
 * Ejemplo: agosto 2026, curso seq=1, inscripción 1 → "2608-001-0001"
 * Usa upsert dentro de transacción para evitar condición de carrera.
 */
export async function generarFolio(courseSeq: number): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear() % 100).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const ccc = String(courseSeq).padStart(3, '0')
  const key = `${yy}${mm}-${ccc}`

  const counter = await prisma.$transaction(async (tx) => {
    return tx.folioCounter.upsert({
      where: { key },
      create: { key, lastNo: 1 },
      update: { lastNo: { increment: 1 } },
    })
  })

  const nnnn = String(counter.lastNo).padStart(4, '0')
  return `${yy}${mm}-${ccc}-${nnnn}`
}
