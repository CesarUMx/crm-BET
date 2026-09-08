import ExcelJS from 'exceljs'
import { prisma } from '../../config/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { generarMatricula } from '../../utils/matricula'
import { logAudit } from '../../utils/audit-log'
import { enrollmentService } from '../enrollments/enrollment.service'
import { createStudentSchema } from 'shared'

// Encabezados de la plantilla (deben coincidir en orden con las columnas leídas al importar)
const HEADERS = ['Nombre(s)', 'Apellido(s)', 'Correo electrónico', 'Teléfono', 'Fecha de nacimiento (YYYY-MM-DD)']

export const studentImportService = {
  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Alumnos')

    sheet.columns = HEADERS.map((header) => ({ header, key: header, width: 28 }))
    sheet.getRow(1).font = { bold: true }

    // Fila de ejemplo para guiar al usuario (se ignora automáticamente si el email ya existe o el formato no corresponde)
    sheet.addRow(['Juan', 'Pérez López', 'juan.perez@ejemplo.com', '4421234567', '2000-05-15'])

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  },

  /**
   * Importa alumnos desde un .xlsx. Si un correo ya existe, se REUTILIZA ese alumno
   * (no se crea de nuevo ni se sobreescriben sus datos). Si se indica `courseId`,
   * cada alumno (nuevo o existente) se inscribe también a ese curso/grupo,
   * reutilizando las mismas reglas de negocio que una inscripción manual
   * (cupo, curso abierto, grupo no vencido, sin duplicar inscripción activa).
   */
  async importFromBuffer(buffer: Buffer, actorId: string, courseId?: string, groupId?: string) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new AppError(400, 'INVALID_FILE', 'El archivo no contiene hojas de cálculo')

    const errors: { row: number; message: string }[] = []
    let studentsCreated = 0
    let studentsReused = 0
    let enrolled = 0

    // Fila 1 = encabezados; se procesa desde la fila 2
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber)
      if (row.values === undefined || (Array.isArray(row.values) && row.values.length === 0)) continue

      const firstName = String(row.getCell(1).value ?? '').trim()
      const lastName = String(row.getCell(2).value ?? '').trim()
      const email = String(row.getCell(3).value ?? '').trim()
      const phone = String(row.getCell(4).value ?? '').trim()
      const rawBirthDate = row.getCell(5).value

      // Filas totalmente vacías se ignoran silenciosamente (no cuentan como error)
      if (!firstName && !lastName && !email && !phone && !rawBirthDate) continue

      // ExcelJS puede devolver una fecha como objeto Date si la celda tiene formato de fecha
      const birthDate =
        rawBirthDate instanceof Date
          ? rawBirthDate.toISOString().slice(0, 10)
          : String(rawBirthDate ?? '').trim()

      const parsed = createStudentSchema.safeParse({ firstName, lastName, email, phone, birthDate })
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0]
        errors.push({ row: rowNumber, message: firstIssue?.message ?? 'Datos inválidos' })
        continue
      }

      // Encuentra o crea al alumno (si ya existe, se reutiliza tal cual está, sin sobreescribir)
      let studentId: string
      const existing = await prisma.student.findUnique({ where: { email: parsed.data.email } })
      if (existing) {
        studentId = existing.id
        studentsReused++
      } else {
        const matricula = await generarMatricula()
        const created = await prisma.student.create({
          data: {
            matricula,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            email: parsed.data.email,
            phone: parsed.data.phone,
            birthDate: new Date(parsed.data.birthDate),
          },
        })
        studentId = created.id
        studentsCreated++
      }

      // Inscripción opcional al curso/grupo elegido para todo el lote
      if (courseId) {
        try {
          await enrollmentService.create({ studentId, courseId, groupId }, actorId)
          enrolled++
        } catch (err) {
          const message = err instanceof AppError ? err.message : 'Error al inscribir'
          errors.push({ row: rowNumber, message: `Inscripción: ${message}` })
        }
      }
    }

    await logAudit({
      actorId,
      action: 'STUDENT_IMPORT',
      entity: 'Student',
      meta: { studentsCreated, studentsReused, enrolled, errorCount: errors.length, courseId },
    })
    return { studentsCreated, studentsReused, enrolled, errors }
  },
}
