import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { requireAuth } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createGroupMaterialSchema } from 'shared'
import { materialController } from './material.controller'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'materials')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// Tipos permitidos para material de apoyo: video, imagen, PowerPoint, Word, PDF, Excel
const ALLOWED_MIME = [
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname)
      cb(null, `${crypto.randomUUID()}${ext}`)
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(new Error('Tipo de archivo no permitido'))
      return
    }
    cb(null, true)
  },
})

// Anidado al grupo (mergeParams para leer :groupId del router padre)
export const materialsRouter = Router({ mergeParams: true })
materialsRouter.use(requireAuth)
materialsRouter.get('/', materialController.listByGroup)
materialsRouter.post('/', upload.single('file'), validate(createGroupMaterialSchema), materialController.create)

// Id plano: borrar y descargar
export const materialItemRouter = Router()
materialItemRouter.use(requireAuth)
materialItemRouter.delete('/:id', materialController.remove)
materialItemRouter.get('/:id/download', materialController.download)
