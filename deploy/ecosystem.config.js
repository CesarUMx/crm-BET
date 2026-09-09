// deploy/ecosystem.config.js
// Configuración de PM2 para producción (ver §11.1 del plan).
// Ejecutar en modo fork para que express-rate-limit (store en memoria) funcione correctamente.

const path = require('path')

// Rutas relativas a este archivo (crm-BET/deploy/), no hardcoded, para que
// funcione sin importar si el repo vive en ~/CRM/crm-BET, /var/www/... etc.
const repoRoot = path.resolve(__dirname, '..')

module.exports = {
  apps: [
    {
      name: 'control-alumnos-api',
      script: './deploy/start-api.sh',
      interpreter: 'none',
      cwd: repoRoot,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      // Logs (dentro del repo para no depender de permisos en /var/log)
      out_file: path.join(repoRoot, 'logs', 'control-alumnos-out.log'),
      error_file: path.join(repoRoot, 'logs', 'control-alumnos-error.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
