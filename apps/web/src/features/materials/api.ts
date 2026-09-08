import { api } from '../../lib/axios'

export interface GroupMaterialRow {
  id: string
  groupId: string
  sectionId: string | null
  title: string
  type: 'DOCUMENT' | 'LINK'
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  externalUrl: string | null
  uploadedBy: string
  createdAt: string
}

export const materialsApi = {
  listByGroup: (groupId: string) =>
    api.get<{ data: GroupMaterialRow[] }>(`/groups/${groupId}/materials`),

  createLink: (groupId: string, title: string, externalUrl: string, sectionId?: string) =>
    api.post<{ data: GroupMaterialRow }>(`/groups/${groupId}/materials`, {
      title,
      type: 'LINK',
      externalUrl,
      sectionId,
    }),

  createDocument: (groupId: string, title: string, file: File, onProgress?: (pct: number) => void, sectionId?: string) => {
    const formData = new FormData()
    formData.append('title', title)
    formData.append('type', 'DOCUMENT')
    formData.append('file', file)
    if (sectionId) formData.append('sectionId', sectionId)
    return api.post<{ data: GroupMaterialRow }>(`/groups/${groupId}/materials`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
  },

  remove: (id: string) =>
    api.delete(`/materials/${id}`),

  // Requiere Authorization header (JWT), por eso se descarga como blob y no con <a href> directo
  download: (id: string) =>
    api.get(`/materials/${id}/download`, { responseType: 'blob' }),
}
