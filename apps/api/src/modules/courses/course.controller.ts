import { Request, Response } from 'express'
import { courseService } from './course.service'

export const courseController = {
  list: async (req: Request, res: Response) => {
    const { search, type, status, page, pageSize } = req.query
    const result = await courseService.list({
      search: search as string,
      type: type as string,
      status: status as string,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    })
    const { courses, total, page: p, pageSize: ps, totalPages } = result
    res.json({ data: courses, meta: { page: p, pageSize: ps, total, totalPages } })
  },

  getById: async (req: Request, res: Response) => {
    const course = await courseService.getById(req.params['id'] as string)
    res.json({ data: course })
  },

  create: async (req: Request, res: Response) => {
    const course = await courseService.create(req.body, req.user!.id)
    res.status(201).json({ data: course })
  },

  update: async (req: Request, res: Response) => {
    const course = await courseService.update(req.params['id'] as string, req.body, req.user!.id)
    res.json({ data: course })
  },

  archive: async (req: Request, res: Response) => {
    await courseService.archive(req.params['id'] as string, req.user!.id)
    res.json({ data: { message: 'Curso archivado' } })
  },
}
