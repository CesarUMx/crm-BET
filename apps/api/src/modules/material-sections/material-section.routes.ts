import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createMaterialSectionSchema, updateMaterialSectionSchema } from 'shared'
import { materialSectionController } from './material-section.controller'

// Anidado al grupo (mergeParams para leer :groupId del router padre)
export const materialSectionsRouter = Router({ mergeParams: true })
materialSectionsRouter.use(requireAuth)
materialSectionsRouter.get('/', materialSectionController.listByGroup)
materialSectionsRouter.post('/', validate(createMaterialSectionSchema), materialSectionController.create)

// Id plano: editar y borrar
export const materialSectionItemRouter = Router()
materialSectionItemRouter.use(requireAuth)
materialSectionItemRouter.put('/:id', validate(updateMaterialSectionSchema), materialSectionController.update)
materialSectionItemRouter.delete('/:id', materialSectionController.remove)
