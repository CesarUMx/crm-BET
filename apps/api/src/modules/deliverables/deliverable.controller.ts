import { Request, Response } from 'express'
import { deliverableService } from './deliverable.service'

export const deliverableController = {
  listByGroup: async (req: Request, res: Response) => {
    const deliverables = await deliverableService.listByGroup(req.params['groupId'] as string, req.user!.id, req.user!.role)
    res.json({ data: deliverables })
  },

  create: async (req: Request, res: Response) => {
    const deliverable = await deliverableService.create(req.params['groupId'] as string, req.body, req.user!.id, req.user!.role)
    res.status(201).json({ data: deliverable })
  },

  update: async (req: Request, res: Response) => {
    const deliverable = await deliverableService.update(req.params['id'] as string, req.body, req.user!.id, req.user!.role)
    res.json({ data: deliverable })
  },

  remove: async (req: Request, res: Response) => {
    await deliverableService.remove(req.params['id'] as string, req.user!.id, req.user!.role)
    res.json({ data: { message: 'Entregable eliminado' } })
  },
}
