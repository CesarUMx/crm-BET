export type Role = 'SUPER_ADMIN' | 'COORDINADOR' | 'DOCENTE' | 'ALUMNO'
export type StudentStatus = 'ACTIVE' | 'INACTIVE'
export type CourseType = 'CURSO' | 'DIPLOMADO'
export type Modality = 'PRESENCIAL' | 'EN_LINEA' | 'HIBRIDO'
export type CourseStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED'
export type EnrollmentStatus = 'ENROLLED' | 'WITHDRAWN' | 'COMPLETED'

export interface ApiResponse<T> {
  data: T
  meta?: PaginationMeta
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
