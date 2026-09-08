import { api } from '../../lib/axios'
import type { LoginInput, ChangePasswordInput } from 'shared'

export const authApi = {
  login: (data: LoginInput) =>
    api.post<{ data: { accessToken: string; user: AuthUser } }>('/auth/login', data),

  googleLogin: (accessToken: string) =>
    api.post<{ data: { accessToken: string; user: AuthUser } }>('/auth/google', { accessToken }),

  refresh: () =>
    api.post<{ data: { accessToken: string } }>('/auth/refresh'),

  logout: () => api.post('/auth/logout'),

  me: (token: string) =>
    api.get<{ data: AuthUser }>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  changePassword: (data: ChangePasswordInput) =>
    api.put('/auth/password', data),
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'COORDINADOR' | 'DOCENTE' | 'ALUMNO'
  mustChangePassword: boolean
}
