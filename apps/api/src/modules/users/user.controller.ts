import { Request, Response } from 'express'
import { userService } from './user.service'

export const userController = {
  list: async (req: Request, res: Response) => {
    const result = await userService.list(req.query)
    res.json(result)
  },

  create: async (req: Request, res: Response) => {
    const user = await userService.create(req.body, req.user!.id, req.ip)
    res.status(201).json({ data: user })
  },

  update: async (req: Request, res: Response) => {
    const user = await userService.update(req.params['id'] as string, req.body, req.user!.id, req.ip)
    res.json({ data: user })
  },

  resetPassword: async (req: Request, res: Response) => {
    const result = await userService.resetPassword(req.params['id'] as string, req.user!.id, req.ip)
    res.json({ data: result })
  },

  deactivate: async (req: Request, res: Response) => {
    await userService.deactivate(req.params['id'] as string, req.user!.id, req.ip)
    res.status(204).send()
  },

  listDocentes: async (req: Request, res: Response) => {
    const result = await userService.listDocentes(req.query)
    res.json(result)
  },

  createDocente: async (req: Request, res: Response) => {
    const user = await userService.createDocente(req.body, req.user!.id, req.ip)
    res.status(201).json({ data: user })
  },

  deactivateDocente: async (req: Request, res: Response) => {
    await userService.deactivateDocente(req.params['id'] as string, req.user!.id, req.ip)
    res.status(204).send()
  },
}
