import { api } from '../../lib/axios'
import type { CreateCourseInput, UpdateCourseInput, PaginationMeta } from 'shared'

export interface CourseRow {
  id: string
  code: string
  name: string
  type: 'CURSO' | 'DIPLOMADO'
  modality: 'PRESENCIAL' | 'EN_LINEA' | 'HIBRIDO'
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED'
  createdAt: string
  _count: { enrollments: number; groups: number }
}

export interface CourseDetail extends Omit<CourseRow, '_count'> {
  description: string | null
  hours: number | null
  duration: string | null
  requirements: string | null
  groups: GroupSummary[]
  _count: { enrollments: number }
}

export interface GroupSummary {
  id: string
  name: string
  capacity: number | null
  schedule: string | null
  createdAt: string
}

export const coursesApi = {
  list: (params?: { search?: string; type?: string; status?: string; page?: number; pageSize?: number }) =>
    api.get<{ data: CourseRow[]; meta: PaginationMeta }>('/courses', { params }),

  getById: (id: string) =>
    api.get<{ data: CourseDetail }>(`/courses/${id}`),

  create: (data: CreateCourseInput) =>
    api.post<{ data: CourseRow }>('/courses', data),

  update: (id: string, data: UpdateCourseInput) =>
    api.put<{ data: CourseRow }>(`/courses/${id}`, data),

  archive: (id: string) =>
    api.delete(`/courses/${id}`),
}
