import { Router } from 'express'
import { authRouter } from './modules/auth/auth.routes'
import { usersRouter, docentesRouter } from './modules/users/user.routes'
import { auditRouter } from './modules/audit/audit.routes'
import { studentsRouter, studentsPublicRouter } from './modules/students/student.routes'
import { coursesRouter } from './modules/courses/course.routes'
import { groupsRouter, courseGroupsRouter, myGroupsRouter, groupEnrollmentsRouter } from './modules/groups/group.routes'
import { enrollmentsRouter } from './modules/enrollments/enrollment.routes'
import { materialsRouter, materialItemRouter } from './modules/materials/material.routes'
import { materialSectionsRouter, materialSectionItemRouter } from './modules/material-sections/material-section.routes'
import { classSessionsRouter, classSessionItemRouter } from './modules/class-sessions/class-session.routes'
import { deliverablesRouter, deliverableItemRouter } from './modules/deliverables/deliverable.routes'
import { evaluationsRouter, evaluationItemRouter } from './modules/evaluations/evaluation.routes'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.use('/auth', authRouter)
router.use('/users', usersRouter)
router.use('/docentes', docentesRouter)
router.use('/audit-logs', auditRouter)
// Pública (API key), montada antes de /students (que exige sesión de staff)
router.use('/public/students', studentsPublicRouter)
router.use('/students', studentsRouter)
router.use('/courses', coursesRouter)
router.use('/courses/:courseId/groups', courseGroupsRouter)
router.use('/my-groups', myGroupsRouter)
// Montadas ANTES de /groups: por prefijo, Express entraría primero al router de /groups
// (requireStaff) para estas rutas si se registrara antes, bloqueando a Docente/Alumno con 403
router.use('/groups/:groupId/materials', materialsRouter)
router.use('/groups/:groupId/material-sections', materialSectionsRouter)
router.use('/groups/:groupId/sessions', classSessionsRouter)
router.use('/groups/:groupId/enrollments', groupEnrollmentsRouter)
router.use('/groups/:groupId/deliverables', deliverablesRouter)
router.use('/groups/:groupId/evaluations', evaluationsRouter)
router.use('/groups', groupsRouter)
router.use('/materials', materialItemRouter)
router.use('/material-sections', materialSectionItemRouter)
router.use('/sessions', classSessionItemRouter)
router.use('/deliverables', deliverableItemRouter)
router.use('/evaluations', evaluationItemRouter)
router.use('/enrollments', enrollmentsRouter)

export { router }
