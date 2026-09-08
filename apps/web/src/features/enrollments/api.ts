import { api } from '../../lib/axios'
import type { CreateEnrollmentInput, PaginationMeta } from 'shared'

export interface EnrollmentRow {
  id: string
  folio: string
  status: 'ENROLLED' | 'WITHDRAWN' | 'COMPLETED'
  enrolledAt: string
  student: { id: string; matricula: string; firstName: string; lastName: string }
  course: { id: string; code: string; name: string; type: string }
  group: { id: string; name: string } | null
}

export const enrollmentsApi = {
  list: (params?: { courseId?: string; groupId?: string; studentId?: string; page?: number; pageSize?: number }) =>
    api.get<{ data: EnrollmentRow[]; meta: PaginationMeta }>('/enrollments', { params }),

  create: (data: CreateEnrollmentInput) =>
    api.post<{ data: EnrollmentRow }>('/enrollments', data),

  assignGroup: (id: string, groupId: string) =>
    api.put<{ data: EnrollmentRow }>(`/enrollments/${id}/group`, { groupId }),

  updateStatus: (id: string, status: 'ENROLLED' | 'WITHDRAWN' | 'COMPLETED') =>
    api.put<{ data: EnrollmentRow }>(`/enrollments/${id}/status`, { status }),

  remove: (id: string) =>
    api.delete(`/enrollments/${id}`),
}
