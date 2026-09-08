import { api } from '../../lib/axios'

export interface MaterialSectionRow {
  id: string
  groupId: string
  title: string
  order: number
  createdAt: string
}

export const materialSectionsApi = {
  listByGroup: (groupId: string) =>
    api.get<{ data: MaterialSectionRow[] }>(`/groups/${groupId}/material-sections`),

  create: (groupId: string, title: string) =>
    api.post<{ data: MaterialSectionRow }>(`/groups/${groupId}/material-sections`, { title }),

  update: (id: string, title: string) =>
    api.put<{ data: MaterialSectionRow }>(`/material-sections/${id}`, { title }),

  remove: (id: string) =>
    api.delete(`/material-sections/${id}`),
}
