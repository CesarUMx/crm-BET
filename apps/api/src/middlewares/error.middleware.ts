import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import multer from 'multer'
import { Prisma } from '@prisma/client'
import { logger } from '../config/logger'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        details: err.flatten().fieldErrors,
      },
    })
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    })
    return
  }

  // Body JSON mal formado (lo lanza express.json() antes de llegar a cualquier ruta)
  if (err instanceof SyntaxError && (err as { status?: number }).status === 400 && 'body' in err) {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'El cuerpo de la solicitud no es un JSON válido' },
    })
    return
  }

  // Errores de subida de archivos (multer), p.ej. exceder el límite de tamaño
  if (err instanceof multer.MulterError) {
    const messages: Partial<Record<string, string>> = {
      LIMIT_FILE_SIZE: 'El archivo supera el tamaño máximo permitido (500 MB)',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado',
    }
    res.status(400).json({
      error: { code: err.code, message: messages[err.code] ?? 'Error al subir el archivo' },
    })
    return
  }

  // Salvaguarda para errores de Prisma no anticipados explícitamente en los servicios
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.['target'] as string[] | undefined)?.join(', ')
      res.status(409).json({
        error: {
          code: 'DUPLICATE',
          message: fields ? `Ya existe un registro con ese valor en: ${fields}` : 'Ya existe un registro con ese valor',
        },
      })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'El registro no existe o ya fue eliminado' },
      })
      return
    }
    if (err.code === 'P2003') {
      res.status(409).json({
        error: { code: 'FOREIGN_KEY_CONSTRAINT', message: 'No se puede completar la operación por registros relacionados existentes' },
      })
      return
    }
  }

  // No filtrar detalles internos al cliente
  logger.error(err)
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  })
}
