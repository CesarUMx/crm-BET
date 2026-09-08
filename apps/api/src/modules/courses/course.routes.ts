import { Router } from 'express'
import { requireAuth, requireStaff } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createCourseSchema, updateCourseSchema } from 'shared'
import { courseController } from './course.controller'

export const coursesRouter = Router()

coursesRouter.use(requireAuth, requireStaff)

coursesRouter.get('/', courseController.list)
coursesRouter.get('/:id', courseController.getById)
coursesRouter.post('/', validate(createCourseSchema), courseController.create)
coursesRouter.put('/:id', validate(updateCourseSchema), courseController.update)
coursesRouter.delete('/:id', courseController.archive)
