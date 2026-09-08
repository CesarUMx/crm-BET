import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createEvaluationSchema, updateEvaluationSchema } from 'shared'
import { evaluationController } from './evaluation.controller'

// Anidado al grupo (mergeParams para leer :groupId del router padre)
export const evaluationsRouter = Router({ mergeParams: true })
evaluationsRouter.use(requireAuth)
evaluationsRouter.get('/', evaluationController.listByGroup)
evaluationsRouter.post('/', validate(createEvaluationSchema), evaluationController.create)

// Id plano: editar y borrar
export const evaluationItemRouter = Router()
evaluationItemRouter.use(requireAuth)
evaluationItemRouter.put('/:id', validate(updateEvaluationSchema), evaluationController.update)
evaluationItemRouter.delete('/:id', evaluationController.remove)
