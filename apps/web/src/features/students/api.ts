import { api } from '../../lib/axios'
import type { CreateStudentInput, UpdateStudentInput, PaginationMeta } from 'shared'

export interface StudentRow {
  id: string
  matricula: string
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: string
  age: number
  status: 'ACTIVE' | 'INACTIVE'
  hasAccess: boolean
  createdAt: string
}

export const studentsApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number; status?: string; access?: string }) =>
    api.get<{ data: StudentRow[]; meta: PaginationMeta }>('/students', { params }),

  getById: (id: string) =>
    api.get<{ data: StudentRow & { enrollments: EnrollmentSummary[]; user: { id: string; isActive: boolean } | null } }>(`/students/${id}`),

  create: (data: CreateStudentInput) =>
    api.post<{ data: StudentRow }>('/students', data),

  update: (id: string, data: UpdateStudentInput) =>
    api.put<{ data: StudentRow }>(`/students/${id}`, data),

  deactivate: (id: string) =>
    api.delete(`/students/${id}`),

  activate: (id: string) =>
    api.post(`/students/${id}/activate`),

  activateAccess: (id: string) =>
    api.post<{ data: { tempPassword: string } }>(`/students/${id}/activate-access`),

  activateAccessBulk: (studentIds: string[]) =>
    api.post<{ data: BulkActivateResult }>('/students/activate-access-bulk', { studentIds }),

  downloadTemplate: () =>
    api.get('/students/import/template', { responseType: 'blob' }),

  import: (file: File, courseId?: string, groupId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (courseId) formData.append('courseId', courseId)
    if (groupId) formData.append('groupId', groupId)
    return api.post<{ data: ImportResult }>('/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export interface BulkActivateResult {
  succeeded: number
  failed: number
  results: { id: string; success: boolean; message?: string }[]
}


export interface ImportResult {
  studentsCreated: number
  studentsReused: number
  enrolled: number
  errors: { row: number; message: string }[]
}

export interface EnrollmentSummary {
  id: string
  folio: string
  status: string
  enrolledAt: string
  course: { id: string; code: string; name: string; type: string }
  group: { id: string; name: string } | null
}
