import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createClassSessionSchema, updateClassSessionSchema } from 'shared'
import { classSessionController } from './class-session.controller'

// Anidado al grupo: listar y crear
export const classSessionsRouter = Router({ mergeParams: true })
classSessionsRouter.use(requireAuth)
classSessionsRouter.get('/', classSessionController.listByGroup)
classSessionsRouter.post('/', validate(createClassSessionSchema), classSessionController.create)

// Id plano: editar y borrar
export const classSessionItemRouter = Router()
classSessionItemRouter.use(requireAuth)
classSessionItemRouter.put('/:id', validate(updateClassSessionSchema), classSessionController.update)
classSessionItemRouter.delete('/:id', classSessionController.remove)
