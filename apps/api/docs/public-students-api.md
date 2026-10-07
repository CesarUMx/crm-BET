# API pública — Consulta de alumno por matrícula

Endpoint de solo lectura para integraciones externas (otros sistemas/desarrollos) que necesiten
verificar datos básicos de un alumno a partir de su matrícula.

## Endpoint

```
GET /api/v1/public/students/:matricula
```

- **Base URL producción:** `https://<tu-dominio>/api/v1`
- **Autenticación:** header `x-api-key` (API key estática, distinta del login de usuarios/staff).
- **Rate limit:** 60 solicitudes / 15 minutos por IP. Al exceder, responde `429` con `code: "RATE_LIMIT"`.

## Autenticación

Enviar la API key en el header `x-api-key` en cada solicitud:

```
x-api-key: <API_KEY>
```

La API key se configura en el servidor vía la variable de entorno `PUBLIC_API_KEY`. Solicítala al
equipo administrador del CRM; no se debe compartir en repositorios públicos ni en el frontend.

## Solicitud

```
GET /api/v1/public/students/202412358
x-api-key: <API_KEY>
```

## Respuesta exitosa (200)

```json
{
    "ok": true,
    "data": {
        "matricula": "2600001",
        "nombre": "prueba1 test",
        "correo": "cortiz94@pm.me",
        "curso": "Test 1",
        "tipo": "CURSO",
        "activo": true
    }
}

```

### Campos

| Campo      | Tipo             | Descripción                                                                 |
|------------|------------------|------------------------------------------------------------------------------|
| `matricula`| string           | Matrícula del alumno.                                                        |
| `nombre`   | string           | Nombre completo (nombre(s) + apellidos).                                     |
| `correo`   | string           | Correo institucional del alumno.                                            |
| `curso`    | string \| null   | Nombre del curso/diploma/maestría de la inscripción activa más reciente. `null` si no tiene inscripción activa. |
| `tipo`     | string \| null   | Tipo de oferta del curso (p. ej. `CURSO`, `DIPLOMADO`, `MAESTRIA`, según catálogo interno). `null` si no aplica. |
| `activo`   | boolean          | `true` si el alumno está activo (`status = ACTIVE`) en el sistema.           |

> Nota: `curso`/`tipo` reflejan la inscripción (`enrollment`) con estado `ENROLLED` más reciente. Si el
> alumno no tiene ninguna inscripción activa, ambos campos regresan `null` aunque `activo` sea `true`.

## Errores

Todas las respuestas de error siguen el formato:

```json
{ "error": { "code": "STRING_CODE", "message": "Descripción legible" } }
```

| HTTP | code            | Causa                                                        |
|------|-----------------|---------------------------------------------------------------|
| 401  | `UNAUTHORIZED`  | Falta el header `x-api-key` o la key enviada es inválida.     |
| 404  | `NOT_FOUND`     | No existe ningún alumno con esa matrícula.                    |
| 429  | `RATE_LIMIT`    | Se superó el límite de 60 solicitudes / 15 min desde esa IP.  |

## Ejemplo (curl)

```bash
curl -H "x-api-key: TU_API_KEY" \
  "https://<tu-dominio>/api/v1/public/students/202412358"
```

## Ejemplo (fetch / Node.js)

```js
const res = await fetch(`${BASE_URL}/api/v1/public/students/${matricula}`, {
  headers: { 'x-api-key': process.env.PUBLIC_API_KEY },
})
const body = await res.json()
if (!res.ok) {
  // body.error.code, body.error.message
}
```
