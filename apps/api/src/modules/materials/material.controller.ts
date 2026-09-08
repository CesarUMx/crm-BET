import { Request, Response } from 'express'
import path from 'path'
import { materialService } from './material.service'

export const materialController = {
  listByGroup: async (req: Request, res: Response) => {
    const materials = await materialService.listByGroup(req.params['groupId'] as string, req.user!.id, req.user!.role)
    res.json({ data: materials })
  },

  create: async (req: Request, res: Response) => {
    const material = await materialService.create(
      req.params['groupId'] as string,
      req.body,
      req.file,
      req.user!.id,
      req.user!.role,
    )
    res.status(201).json({ data: material })
  },

  remove: async (req: Request, res: Response) => {
    await materialService.remove(req.params['id'] as string, req.user!.id, req.user!.role)
    res.json({ data: { message: 'Material eliminado' } })
  },

  download: async (req: Request, res: Response) => {
    const material = await materialService.getForDownload(req.params['id'] as string, req.user!.id, req.user!.role)
    const filePath = path.join(process.cwd(), 'uploads', 'materials', path.basename(material.fileUrl!))
    res.download(filePath, material.fileName ?? path.basename(material.fileUrl!))
  },
}
