import { Request, Response } from 'express'
import { z } from 'zod'
import { auditService } from './audit.service'

const querySchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export const auditController = {
  list: async (req: Request, res: Response) => {
    const params = querySchema.parse(req.query)
    const result = await auditService.list(params)
    res.json(result)
  },
}
