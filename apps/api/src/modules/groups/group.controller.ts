import { Request, Response } from 'express'
import { groupService } from './group.service'

export const groupController = {
  listTeachers: async (_req: Request, res: Response) => {
    const teachers = await groupService.listTeachers()
    res.json({ data: teachers })
  },

  listMine: async (req: Request, res: Response) => {
    const groups = await groupService.listMine(req.user!.id, req.user!.role)
    res.json({ data: groups })
  },

  listEnrollments: async (req: Request, res: Response) => {
    const enrollments = await groupService.listEnrollments(req.params['groupId'] as string, req.user!.id, req.user!.role)
    res.json({ data: enrollments })
  },

  listByCourse: async (req: Request, res: Response) => {
    const groups = await groupService.listByCourse(req.params['courseId'] as string)
    res.json({ data: groups })
  },

  getById: async (req: Request, res: Response) => {
    const group = await groupService.getById(req.params['id'] as string)
    res.json({ data: group })
  },

  create: async (req: Request, res: Response) => {
    const group = await groupService.create(req.params['courseId'] as string, req.body, req.user!.id)
    res.status(201).json({ data: group })
  },

  update: async (req: Request, res: Response) => {
    const group = await groupService.update(req.params['id'] as string, req.body, req.user!.id)
    res.json({ data: group })
  },

  remove: async (req: Request, res: Response) => {
    await groupService.remove(req.params['id'] as string, req.user!.id)
    res.json({ data: { message: 'Grupo eliminado' } })
  },
}
