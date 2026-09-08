import { api } from '../../lib/axios'
import type { CreateGroupInput, UpdateGroupInput } from 'shared'

export interface GroupRow {
  id: string
  name: string
  capacity: number | null
  schedule: string | null
  startDate: string | null
  endDate: string | null
  isExpired: boolean
  teacherId: string | null
  onlineMeetingUrl: string | null
  createdAt: string
  _count: { enrollments: number }
}

export interface GroupDetail {
  id: string
  name: string
  capacity: number | null
  schedule: string | null
  startDate: string | null
  endDate: string | null
  isExpired: boolean
  teacherId: string | null
  onlineMeetingUrl: string | null
  course: { id: string; code: string; name: string }
  enrollments: {
    id: string
    folio: string
    student: { id: string; matricula: string; firstName: string; lastName: string }
  }[]
}

export interface TeacherOption {
  id: string
  name: string
  email: string
}

export interface MyGroupRow {
  id: string
  name: string
  schedule: string | null
  startDate: string | null
  endDate: string | null
  isExpired: boolean
  teacherId: string | null
  onlineMeetingUrl: string | null
  enrollmentStatus: string | null
  course: { id: string; code: string; name: string }
}

export interface GroupEnrollmentRow {
  id: string
  folio: string
  status: string
  enrolledAt: string
  student: {
    id: string
    matricula: string
    firstName: string
    lastName: string
    email: string
    phone: string
    birthDate: string
    status: string
  }
}

export const groupsApi = {
  listByCourse: (courseId: string) =>
    api.get<{ data: GroupRow[] }>(`/courses/${courseId}/groups`),

  listTeachers: () =>
    api.get<{ data: TeacherOption[] }>('/groups/teachers/list'),

  listMine: () =>
    api.get<{ data: MyGroupRow[] }>('/my-groups'),

  listEnrollments: (groupId: string) =>
    api.get<{ data: GroupEnrollmentRow[] }>(`/groups/${groupId}/enrollments`),

  getById: (id: string) =>
    api.get<{ data: GroupDetail }>(`/groups/${id}`),

  create: (courseId: string, data: CreateGroupInput) =>
    api.post<{ data: GroupRow }>(`/courses/${courseId}/groups`, data),

  update: (id: string, data: UpdateGroupInput) =>
    api.put<{ data: GroupRow }>(`/groups/${id}`, data),

  remove: (id: string) =>
    api.delete(`/groups/${id}`),
}
