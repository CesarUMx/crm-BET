import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireStaff } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createStudentSchema, updateStudentSchema } from 'shared'
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
