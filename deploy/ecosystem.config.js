// deploy/ecosystem.config.js
// Configuración de PM2 para producción (ver §11.1 del plan).
// Ejecutar en modo fork para que express-rate-limit (store en memoria) funcione correctamente.

module.exports = {
  apps: [
    {
      name: 'control-alumnos-api',
      script: './apps/api/dist/server.js',
      cwd: '/var/www/control-alumnos',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      // Logs
      out_file: '/var/log/pm2/control-alumnos-out.log',
      error_file: '/var/log/pm2/control-alumnos-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
