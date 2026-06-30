# Clara API Tester

Cliente REST para la API de Clara. Diseñado para Solutions Engineers.

## Requisitos

- Node.js 18+
- npm 9+

## Desarrollo

```bash
npm install
npm run dev
```

Abrir http://localhost:5173

El servidor proxy corre en :3001 y el frontend en :5173. Vite hace proxy automático de `/proxy` y `/get-token`.

## Producción (build estático)

```bash
npm run build
npm start
```

Abrir http://localhost:3001

## Uso

1. **Subir credenciales** — Arrastra o selecciona `client.crt`, `client.key`, `client_id`, `client_secret`
2. **Seleccionar mercado** — México / Brasil / Colombia. Activar "Sandbox" para usar `/api-test/`
3. **Obtener Token** — Clic en "Obtener Token". Se renueva automáticamente.
4. **Validar Conexión** — Hace un GET a `/api/v3/users` para confirmar que todo funciona
5. **Construir Request** — Selecciona un endpoint del catálogo o escribe la URL manualmente
6. **Enviar** — La respuesta aparece en el panel derecho con syntax highlighting

## Troubleshooting

### Error: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
El certificado del cliente no es válido o no coincide con el mercado. Verificar que el `.crt` y `.key` corresponden al mismo par.

### Error: `401 Unauthorized` al obtener token
- Verificar que `client_id` y `client_secret` son correctos
- Confirmar el mercado seleccionado (las credenciales son por mercado)
- Si usas Sandbox, las credenciales pueden ser distintas a producción

### Error: `403 Forbidden` en endpoints
El token se obtuvo correctamente pero el cliente no tiene permisos para ese recurso. Verificar scopes con el equipo de Clara.

### `ECONNREFUSED` al enviar requests
El servidor proxy no está corriendo. Ejecutar `npm run dev` o verificar que `node server.js` está activo.

### Token expira rápido
El campo "Expira en" muestra la cuenta regresiva. El botón "Renovar Token" aparece automáticamente cuando quedan menos de 60 segundos.

### Body JSON inválido
El constructor valida el JSON antes de enviar. Si hay un error de parseo, aparece en rojo bajo el editor de body.
