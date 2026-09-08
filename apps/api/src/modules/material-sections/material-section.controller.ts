import { Request, Response } from 'express'
import { materialSectionService } from './material-section.service'

export const materialSectionController = {
  listByGroup: async (req: Request, res: Response) => {
    const sections = await materialSectionService.listByGroup(req.params['groupId'] as string, req.user!.id, req.user!.role)
    res.json({ data: sections })
  },

  create: async (req: Request, res: Response) => {
    const section = await materialSectionService.create(req.params['groupId'] as string, req.body, req.user!.id, req.user!.role)
    res.status(201).json({ data: section })
  },

  update: async (req: Request, res: Response) => {
    const section = await materialSectionService.update(req.params['id'] as string, req.body, req.user!.id, req.user!.role)
    res.json({ data: section })
  },

  remove: async (req: Request, res: Response) => {
    await materialSectionService.remove(req.params['id'] as string, req.user!.id, req.user!.role)
    res.json({ data: { message: 'Sección eliminada' } })
  },
}
