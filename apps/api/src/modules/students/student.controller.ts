import { Request, Response } from 'express'
import { studentService } from './student.service'
import { studentImportService } from './student-import.service'
import { AppError } from '../../middlewares/error.middleware'

export const studentController = {
  list: async (req: Request, res: Response) => {
    const { search, page, pageSize, status, access } = req.query
    const result = await studentService.list({
      search: search as string,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      status: status as string,
      access: access as string,
    })
    const { students, total, page: p, pageSize: ps, totalPages } = result
    res.json({ data: students, meta: { page: p, pageSize: ps, total, totalPages } })
  },

  getById: async (req: Request, res: Response) => {
    const student = await studentService.getById(req.params['id'] as string)
    res.json({ data: student })
  },

  create: async (req: Request, res: Response) => {
    const student = await studentService.create(req.body, req.user!.id)
    res.status(201).json({ data: student })
  },

  update: async (req: Request, res: Response) => {
    const student = await studentService.update(req.params['id'] as string, req.body, req.user!.id)
    res.json({ data: student })
  },

  deactivate: async (req: Request, res: Response) => {
    await studentService.deactivate(req.params['id'] as string, req.user!.id)
    res.json({ data: { message: 'Alumno dado de baja' } })
  },

  activate: async (req: Request, res: Response) => {
    await studentService.activate(req.params['id'] as string, req.user!.id)
    res.json({ data: { message: 'Alumno reactivado' } })
  },

  activateAccess: async (req: Request, res: Response) => {
    const result = await studentService.activateAccess(req.params['id'] as string, req.user!.id)
    res.json({ data: result })
  },

  activateAccessBulk: async (req: Request, res: Response) => {
    const result = await studentService.activateAccessBulk(req.body.studentIds, req.user!.id)
    res.json({ data: result })
  },

  downloadTemplate: async (_req: Request, res: Response) => {
    const buffer = await studentImportService.generateTemplate()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-alumnos.xlsx"')
    res.send(buffer)
  },

  import: async (req: Request, res: Response) => {
    if (!req.file) throw new AppError(400, 'FILE_REQUIRED', 'Debes subir un archivo .xlsx')
    const courseId = typeof req.body.courseId === 'string' && req.body.courseId ? req.body.courseId : undefined
    const groupId = typeof req.body.groupId === 'string' && req.body.groupId ? req.body.groupId : undefined
    const result = await studentImportService.importFromBuffer(req.file.buffer, req.user!.id, courseId, groupId)
    res.json({ data: result })
  },
}
