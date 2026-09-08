import axios from 'axios'
import { useAuthStore } from './auth.store'

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

// Adjunta el access token desde memoria (nunca de localStorage)
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor de respuesta: refresca el token ante un 401 y reintenta
let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // No reintentar en rutas de auth ni en peticiones ya reintentadas
    if (
      error.response?.status !== 401 ||
      original._retry ||
      (original.url as string)?.includes('/auth/')
    ) {
      return Promise.reject(error)
    }

    original._retry = true

    if (!isRefreshing) {
      isRefreshing = true
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        const newToken: string = data.data.accessToken
        useAuthStore.getState().setAuth(newToken, useAuthStore.getState().user!)
        queue.forEach((cb) => cb(newToken))
        queue = []
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    // Encolar peticiones mientras se refresca
    return new Promise((resolve) => {
      queue.push((token) => {
        original.headers.Authorization = `Bearer ${token}`
        resolve(api(original))
      })
    })
  },
)
