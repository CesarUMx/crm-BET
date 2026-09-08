import { api } from '../../lib/axios'
import type { CreateClassSessionInput, UpdateClassSessionInput } from 'shared'

export interface ClassSessionRow {
  id: string
  groupId: string
  date: string
  topic: string | null
  recordingUrl: string | null
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const classSessionsApi = {
  listByGroup: (groupId: string) =>
    api.get<{ data: ClassSessionRow[] }>(`/groups/${groupId}/sessions`),

  create: (groupId: string, data: CreateClassSessionInput) =>
    api.post<{ data: ClassSessionRow }>(`/groups/${groupId}/sessions`, data),

  update: (id: string, data: UpdateClassSessionInput) =>
    api.put<{ data: ClassSessionRow }>(`/sessions/${id}`, data),

  remove: (id: string) =>
    api.delete(`/sessions/${id}`),
}
