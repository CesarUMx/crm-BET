import { Router } from 'express'
import { requireAuth, requireStaff } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createEnrollmentSchema, assignGroupSchema, updateEnrollmentStatusSchema } from 'shared'
import { enrollmentController } from './enrollment.controller'

export const enrollmentsRouter = Router()

enrollmentsRouter.use(requireAuth, requireStaff)

enrollmentsRouter.get('/', enrollmentController.list)
enrollmentsRouter.post('/', validate(createEnrollmentSchema), enrollmentController.create)
enrollmentsRouter.put('/:id/group', validate(assignGroupSchema), enrollmentController.assignGroup)
enrollmentsRouter.put('/:id/status', validate(updateEnrollmentStatusSchema), enrollmentController.updateStatus)
enrollmentsRouter.delete('/:id', enrollmentController.remove)
