import { api } from '../../lib/axios'

export interface DeliverableRow {
  id: string
  groupId: string
  title: string
  description: string | null
  dueDate: string | null
  createdAt: string
}

export const deliverablesApi = {
  listByGroup: (groupId: string) =>
    api.get<{ data: DeliverableRow[] }>(`/groups/${groupId}/deliverables`),

  create: (groupId: string, data: { title: string; description?: string; dueDate?: string }) =>
    api.post<{ data: DeliverableRow }>(`/groups/${groupId}/deliverables`, data),

  remove: (id: string) =>
    api.delete(`/deliverables/${id}`),
}
