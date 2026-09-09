import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { pinoHttp } from 'pino-http'
import { env } from './config/env'
import { logger } from './config/logger'
import { router } from './routes'
import { errorMiddleware } from './middlewares/error.middleware'

const app = express()

// Necesario para obtener el IP real del cliente detrás de Nginx
app.set('trust proxy', 1)

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
)

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
)

app.use(express.json())
app.use(cookieParser())
app.use(
  pinoHttp({
    logger,
    // No registrar tokens/cookies ni el resto de headers: solo lo útil para depurar
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    serializers: {
      req(req) {
        return { method: req.method, url: req.url }
      },
      res(res) {
        return { statusCode: res.statusCode }
      },
    },
  }),
)

app.use('/api/v1', router)

// Debe ser el último middleware registrado
app.use(errorMiddleware)

export { app }
