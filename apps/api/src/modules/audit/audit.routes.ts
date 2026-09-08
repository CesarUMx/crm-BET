import { Router } from 'express'
import { auditController } from './audit.controller'
import { requireAuth, requireRole } from '../../middlewares/auth.middleware'

export const auditRouter = Router()

auditRouter.use(requireAuth, requireRole('SUPER_ADMIN'))

auditRouter.get('/', auditController.list)
