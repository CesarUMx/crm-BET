import { Router } from 'express'
import { requireAuth, requireStaff } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createGroupSchema, updateGroupSchema } from 'shared'
import { groupController } from './group.controller'

// Anidado al curso: listar y crear (ver §8 del plan)
export const courseGroupsRouter = Router({ mergeParams: true })
courseGroupsRouter.use(requireAuth, requireStaff)
courseGroupsRouter.get('/', groupController.listByCourse)
courseGroupsRouter.post('/', validate(createGroupSchema), groupController.create)

// Portal Docente/Alumno: solo lectura de SUS grupos (sin requireStaff)
export const myGroupsRouter = Router()
myGroupsRouter.use(requireAuth)
myGroupsRouter.get('/', groupController.listMine)

// Roster de un grupo (Docente dueño o Admin/Coordinador); permiso validado dentro del service
export const groupEnrollmentsRouter = Router({ mergeParams: true })
groupEnrollmentsRouter.use(requireAuth)
groupEnrollmentsRouter.get('/', groupController.listEnrollments)

// Id plano: obtener, editar, borrar (el id de grupo es único global)
export const groupsRouter = Router()
groupsRouter.use(requireAuth, requireStaff)
// Antes de "/:id" para que no lo capture como parámetro
groupsRouter.get('/teachers/list', groupController.listTeachers)
groupsRouter.get('/:id', groupController.getById)
groupsRouter.put('/:id', validate(updateGroupSchema), groupController.update)
groupsRouter.delete('/:id', groupController.remove)
