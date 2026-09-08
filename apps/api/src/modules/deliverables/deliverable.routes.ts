import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createDeliverableSchema, updateDeliverableSchema } from 'shared'
import { deliverableController } from './deliverable.controller'

// Anidado al grupo (mergeParams para leer :groupId del router padre)
export const deliverablesRouter = Router({ mergeParams: true })
deliverablesRouter.use(requireAuth)
deliverablesRouter.get('/', deliverableController.listByGroup)
deliverablesRouter.post('/', validate(createDeliverableSchema), deliverableController.create)

// Id plano: editar y borrar
export const deliverableItemRouter = Router()
deliverableItemRouter.use(requireAuth)
deliverableItemRouter.put('/:id', validate(updateDeliverableSchema), deliverableController.update)
deliverableItemRouter.delete('/:id', deliverableController.remove)
