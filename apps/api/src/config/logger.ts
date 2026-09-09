import pino from 'pino'

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Sin esto, un objeto Error dentro de logger.error({ err }, ...) se serializa como {}
  serializers: { err: pino.stdSerializers.err },
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
})
