import { api } from '../../lib/axios'
import type { CreateDocenteInput, PaginationMeta } from 'shared'

export interface DocenteRow {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
}

export const docentesApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<{ data: DocenteRow[]; meta: PaginationMeta }>('/docentes', { params }),

  create: (data: CreateDocenteInput) =>
    api.post<{ data: DocenteRow }>('/docentes', data),

  deactivate: (id: string) =>
    api.delete(`/docentes/${id}`),
}
