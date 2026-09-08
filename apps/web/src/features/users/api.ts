import { api } from '../../lib/axios'
import type { CreateUserInput, UpdateUserInput, PaginationMeta } from 'shared'

export interface UserRow {
  id: string
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'COORDINADOR' | 'DOCENTE' | 'ALUMNO'
  isActive: boolean
  createdAt: string
}

export const usersApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<{ data: UserRow[]; meta: PaginationMeta }>('/users', { params }),

  create: (data: CreateUserInput) =>
    api.post<{ data: UserRow }>('/users', data),

  update: (id: string, data: UpdateUserInput) =>
    api.put<{ data: UserRow }>(`/users/${id}`, data),

  resetPassword: (id: string) =>
    api.post<{ data: { tempPassword: string } }>(`/users/${id}/reset-password`),

  deactivate: (id: string) =>
    api.delete(`/users/${id}`),
}
