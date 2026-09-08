import { app } from './app'
import { env } from './config/env'
import { logger } from './config/logger'

app.listen(env.PORT, () => {
  logger.info(`API corriendo en http://localhost:${env.PORT}/api/v1`)
  logger.info(`Health: http://localhost:${env.PORT}/api/v1/health`)
})
