import { api } from '../../lib/axios'

export interface EvaluationRow {
  id: string
  groupId: string
  title: string
  description: string | null
  externalUrl: string
  createdAt: string
}

export const evaluationsApi = {
  listByGroup: (groupId: string) =>
    api.get<{ data: EvaluationRow[] }>(`/groups/${groupId}/evaluations`),

  create: (groupId: string, data: { title: string; description?: string; externalUrl: string }) =>
    api.post<{ data: EvaluationRow }>(`/groups/${groupId}/evaluations`, data),

  remove: (id: string) =>
    api.delete(`/evaluations/${id}`),
}
