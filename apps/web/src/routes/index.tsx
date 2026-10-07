import { Routes, Route, Navigate } from 'react-router'
import { useState, useEffect, type ReactNode } from 'react'
import { useAuthStore } from '../lib/auth.store'
import { authApi } from '../features/auth/api'
import { LoginPage } from '../features/auth/LoginPage'
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage'
import { Layout } from '../components/shared/Layout'
import { UsersPage } from '../features/users/UsersPage'
import { StudentsPage } from '../features/students/StudentsPage'
import { StudentDetailPage } from '../features/students/StudentDetailPage'
import { CoursesPage } from '../features/courses/CoursesPage'
import { CourseDetailPage } from '../features/courses/CourseDetailPage'
import { DocentesPage } from '../features/docentes/DocentesPage'
import { PortalPage } from '../features/portal/PortalPage'

// Roles con acceso al panel administrativo (Alumnos/Cursos/Grupos/Inscripciones/Usuarios)
const STAFF_ROLES = ['SUPER_ADMIN', 'COORDINADOR']

// ─── Carga silenciosa al recargar: intenta restaurar la sesión ────────────────
function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { accessToken, user, setAuth, clearAuth } = useAuthStore()
  const [loading, setLoading] = useState(!accessToken)

  useEffect(() => {
    if (accessToken) return
    authApi
      .refresh()
      .then(({ data }) => authApi.me(data.data.accessToken).then(({ data: u }) => setAuth(data.data.accessToken, u.data)))
      .catch(() => clearAuth())
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="size-6 animate-spin rounded-full border-2 border-[var(--border-soft)] border-t-transparent" />
      </div>
    )
  }

  if (!accessToken || !user) return <Navigate to="/login" replace />
  if (user.mustChangePassword) return <Navigate to="/cambiar-contrasena" replace />
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={STAFF_ROLES.includes(user.role) ? '/' : '/portal'} replace />
  }

  return <Layout>{children}</Layout>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />

      <Route path="/" element={<ProtectedRoute roles={STAFF_ROLES}><div className="p-2 text-[var(--text-muted)] text-sm">Dashboard — Fase 6</div></ProtectedRoute>} />
      <Route path="/alumnos" element={<ProtectedRoute roles={STAFF_ROLES}><StudentsPage /></ProtectedRoute>} />
      <Route path="/alumnos/:id" element={<ProtectedRoute roles={STAFF_ROLES}><StudentDetailPage /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute roles={['SUPER_ADMIN']}><UsersPage /></ProtectedRoute>} />
      {/* Alta rápida de Docentes: Coordinador (Super Admin ya lo cubre desde Usuarios) */}
      <Route path="/docentes" element={<ProtectedRoute roles={['SUPER_ADMIN', 'COORDINADOR']}><DocentesPage /></ProtectedRoute>} />

      {/* Fase 5 */}
      <Route path="/cursos" element={<ProtectedRoute roles={STAFF_ROLES}><CoursesPage /></ProtectedRoute>} />
      <Route path="/cursos/:id" element={<ProtectedRoute roles={STAFF_ROLES}><CourseDetailPage /></ProtectedRoute>} />

      {/* Fase 6: portal Docente/Alumno */}
      <Route path="/portal" element={<ProtectedRoute roles={['DOCENTE', 'ALUMNO']}><PortalPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
