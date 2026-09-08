import { Request, Response } from 'express'
import { evaluationService } from './evaluation.service'

export const evaluationController = {
  listByGroup: async (req: Request, res: Response) => {
    const evaluations = await evaluationService.listByGroup(req.params['groupId'] as string, req.user!.id, req.user!.role)
    res.json({ data: evaluations })
  },

  create: async (req: Request, res: Response) => {
    const evaluation = await evaluationService.create(req.params['groupId'] as string, req.body, req.user!.id, req.user!.role)
    res.status(201).json({ data: evaluation })
  },

  update: async (req: Request, res: Response) => {
    const evaluation = await evaluationService.update(req.params['id'] as string, req.body, req.user!.id, req.user!.role)
    res.json({ data: evaluation })
  },

  remove: async (req: Request, res: Response) => {
    await evaluationService.remove(req.params['id'] as string, req.user!.id, req.user!.role)
    res.json({ data: { message: 'Evaluación eliminada' } })
  },
}
