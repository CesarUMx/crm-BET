import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { userController } from './user.controller'
import { validate } from '../../middlewares/validate.middleware'
import { requireAuth, requireRole } from '../../middlewares/auth.middleware'
import { createUserSchema, updateUserSchema, createDocenteSchema } from 'shared'

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
})

export const usersRouter = Router()

// Todas las rutas de usuarios requieren auth + rol SUPER_ADMIN
usersRouter.use(requireAuth, requireRole('SUPER_ADMIN'))

usersRouter.get('/', userController.list)
usersRouter.post('/', validate(createUserSchema), userController.create)
usersRouter.put('/:id', validate(updateUserSchema), userController.update)
usersRouter.post('/:id/reset-password', resetPasswordLimiter, userController.resetPassword)
usersRouter.delete('/:id', userController.deactivate)

// Router aparte: alta rápida de Docentes, habilitado también para Coordinador
// (scope reducido: solo rol DOCENTE, sin acceso al resto del CRUD de usuarios)
export const docentesRouter = Router()
docentesRouter.use(requireAuth, requireRole(['SUPER_ADMIN', 'COORDINADOR']))

docentesRouter.get('/', userController.listDocentes)
docentesRouter.post('/', validate(createDocenteSchema), userController.createDocente)
docentesRouter.delete('/:id', userController.deactivateDocente)
