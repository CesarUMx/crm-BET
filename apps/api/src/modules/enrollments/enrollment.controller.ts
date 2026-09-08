import { Request, Response } from 'express'
import { enrollmentService } from './enrollment.service'

export const enrollmentController = {
  list: async (req: Request, res: Response) => {
    const { courseId, groupId, studentId, page, pageSize } = req.query
    const result = await enrollmentService.list({
      courseId: courseId as string,
      groupId: groupId as string,
      studentId: studentId as string,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    })
    const { enrollments, total, page: p, pageSize: ps, totalPages } = result
    res.json({ data: enrollments, meta: { page: p, pageSize: ps, total, totalPages } })
  },

  create: async (req: Request, res: Response) => {
    const enrollment = await enrollmentService.create(req.body, req.user!.id)
    res.status(201).json({ data: enrollment })
  },

  assignGroup: async (req: Request, res: Response) => {
    const enrollment = await enrollmentService.assignGroup(req.params['id'] as string, req.body.groupId, req.user!.id)
    res.json({ data: enrollment })
  },

  updateStatus: async (req: Request, res: Response) => {
    const enrollment = await enrollmentService.updateStatus(req.params['id'] as string, req.body, req.user!.id)
    res.json({ data: enrollment })
  },

  remove: async (req: Request, res: Response) => {
    await enrollmentService.remove(req.params['id'] as string, req.user!.id)
    res.json({ data: { message: 'Inscripción eliminada' } })
  },
}
