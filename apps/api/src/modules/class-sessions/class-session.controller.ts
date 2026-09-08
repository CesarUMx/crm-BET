import { Request, Response } from 'express'
import { classSessionService } from './class-session.service'

export const classSessionController = {
  listByGroup: async (req: Request, res: Response) => {
    const sessions = await classSessionService.listByGroup(req.params['groupId'] as string, req.user!.id, req.user!.role)
    res.json({ data: sessions })
  },

  create: async (req: Request, res: Response) => {
    const session = await classSessionService.create(req.params['groupId'] as string, req.body, req.user!.id, req.user!.role)
    res.status(201).json({ data: session })
  },

  update: async (req: Request, res: Response) => {
    const session = await classSessionService.update(req.params['id'] as string, req.body, req.user!.id, req.user!.role)
    res.json({ data: session })
  },

  remove: async (req: Request, res: Response) => {
    await classSessionService.remove(req.params['id'] as string, req.user!.id, req.user!.role)
    res.json({ data: { message: 'Sesión eliminada' } })
  },
}
