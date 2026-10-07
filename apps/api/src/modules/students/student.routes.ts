import { Router } from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { requireAuth, requireStaff } from '../../middlewares/auth.middleware'
import { requireApiKey } from '../../middlewares/apiKey.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createStudentSchema, updateStudentSchema, activateAccessBulkSchema } from 'shared'
import { studentController } from './student.controller'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const validMime = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    if (!validMime) {
      cb(new Error('Solo se aceptan archivos .xlsx'))
      return
    }
    cb(null, true)
  },
})

// Endpoint público (API key), consumido por integraciones externas: GET /api/v1/public/students/:matricula
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Intente más tarde.' } },
})

export const studentsPublicRouter = Router()
studentsPublicRouter.get('/:matricula', publicLimiter, requireApiKey, studentController.getPublicByMatricula)

export const studentsRouter = Router()

studentsRouter.use(requireAuth, requireStaff)

// Rutas de importación ANTES de /:id para que no colisionen con el parámetro dinámico
studentsRouter.get('/import/template', studentController.downloadTemplate)
studentsRouter.post('/import', upload.single('file'), studentController.import)

studentsRouter.get('/', studentController.list)
studentsRouter.get('/:id', studentController.getById)
studentsRouter.post('/', validate(createStudentSchema), studentController.create)
studentsRouter.put('/:id', validate(updateStudentSchema), studentController.update)
studentsRouter.delete('/:id', studentController.deactivate)
studentsRouter.post('/:id/activate', studentController.activate)
studentsRouter.post('/:id/activate-access', studentController.activateAccess)
studentsRouter.post('/activate-access-bulk', validate(activateAccessBulkSchema), studentController.activateAccessBulk)
