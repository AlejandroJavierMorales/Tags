# Tags QR Agency — diseño técnico y funcional

Fecha: 2026-08-10  
Estado: diseño para aprobación; no implementado  
Addon: `qr_agency`

## 1. Objetivo

Permitir que un cliente de Tags opere como agencia o revendedor de códigos QR dinámicos. Tags le asigna un cupo y la agencia administra clientes finales, asigna uno o varios QR a cada uno y controla su consumo. El cliente final accede a un panel limitado mediante magic link para editar nombre y destino, pausar o reactivar sus QR, definir el mensaje de pausa y consultar estadísticas.

La solución reutiliza `tags_qr_codes` y `tags_clicks`. No crea un segundo motor de QR ni modifica el comportamiento de los QR existentes.

## 2. Actores y aislamiento

### Plataforma Tags

- Crea el negocio normal en `tags_businesses`.
- Le conserva su plan principal y le asigna el addon `qr_agency` con una modalidad propia.
- Define cupo, vigencia, estado y eventuales excepciones.
- Puede administrar cualquier agencia para soporte.

### Agencia

- Accede desde el dashboard normal del negocio.
- Administra solamente sus clientes y QR.
- Puede crear QR hasta completar su cupo.
- Puede enviar o reenviar accesos por email.
- Puede entrar en modo visualización del panel de un cliente, dejando auditoría.

### Cliente final de la agencia

- No se registra como `tags_businesses`.
- Pertenece a una única agencia.
- Accede por un sublogin público de esa agencia.
- Solo puede operar los QR que tiene asignados.
- No puede ver el dashboard del negocio, suscripción, otros clientes ni addons.

## 3. Rutas propuestas

### Administración de la agencia

- `/dashboard/businesses/[businessId]/qr-agency`
- `/dashboard/businesses/[businessId]/qr-agency/customers`
- `/dashboard/businesses/[businessId]/qr-agency/qrs`
- `/dashboard/businesses/[businessId]/qr-agency/analytics`

### Sublogin y panel del cliente final

- `/agency/[agencySlug]/login`: solicita enlace por email.
- `/agency/[agencySlug]/verify?token=...`: consume el magic link y crea sesión.
- `/agency/[agencySlug]/panel`: panel privado.
- `/agency/[agencySlug]/panel/qr/[qrId]`: edición y estadísticas del QR.

El sublogin siempre responde con un mensaje neutro, exista o no el email, para evitar enumeración de clientes.

## 4. Autenticación

1. El cliente ingresa su email en el sublogin de la agencia.
2. La API busca un cliente activo con email normalizado dentro de esa agencia.
3. Si corresponde, genera un token aleatorio; en base se guarda únicamente SHA-256.
4. Envía un magic link de un solo uso y vencimiento corto, inicialmente 30 minutos.
5. Al verificarlo, revoca tokens anteriores del mismo propósito y crea una sesión privada.
6. La cookie será `HttpOnly`, `Secure` en producción, `SameSite=Lax` y limitada al circuito de Agencia.
7. La sesión inicial tendrá 30 días, `last_seen_at` y revocación explícita.

Cambiar el email, suspender el cliente o desactivar la agencia revoca todas sus sesiones.

## 5. Modelo de datos

### Tablas existentes reutilizadas

- `tags_businesses`: titular de la agencia.
- `tags_plans`: plan principal del negocio, independiente de QR Agency.
- `tags_subscriptions`: vigencia y facturación.
- `tags_addons` / `tags_business_addons`: habilitación de QR Agency.
- `tags_qr_codes`: QR dinámico real y destino.
- `tags_clicks`: analítica por QR.
- `tags_products`: producto técnico para QR digital.

### Tablas nuevas

#### `tags_qr_agencies`

Una configuración por negocio. Mantiene slug público, estado, límite operativo, producto digital y políticas.

#### `tags_qr_agency_customers`

Clientes finales de una agencia. El email normalizado es único dentro de la agencia, pero puede existir en otra agencia.

#### `tags_qr_agency_assignments`

Asigna un QR existente a un cliente final. Un QR solo puede pertenecer a una asignación activa de Agencia. El historial se preserva con estado y fechas.

#### `tags_qr_agency_access_tokens`

Magic links de un solo uso. Nunca almacena el token en texto plano.

#### `tags_qr_agency_sessions`

Sesiones privadas y revocables del cliente final.

#### `tags_qr_agency_audit_log`

Audita altas, asignaciones, cambios de URL, pausas, reactivaciones, accesos e impersonación de soporte.

## 6. Cupos

- El límite efectivo se obtiene de `tags_qr_agencies.qr_limit`, sincronizado al activar o cambiar la modalidad del addon.
- Consumen cupo los QR asignados en estado `active` o `paused`.
- Pausar no libera cupo.
- Un QR sin actividad puede eliminarse físicamente solo mediante una operación administrativa controlada.
- Si tuvo clics, se archiva y conserva estadísticas.
- La validación del cupo se realiza dentro de una transacción con bloqueo de la agencia para impedir sobreasignación concurrente.
- `AgenciaPro` se comercializa como ilimitado, pero usa un límite técnico inicial de 1000.

## 7. Modalidades del addon y facturación

| Modalidad | Límite | Precio base | Regla |
|---|---:|---:|---|
| Agencia25 | 25 | ARS 25.000 | Fijo mensual |
| Agencia50 | 50 | ARS 25.000 | Fijo mensual |
| Agencia100 | 100 | ARS 25.000 | ARS 500 por cada QR activo adicional al 50 |
| AgenciaPro | 1000 técnico | ARS 50.000 | Comercialmente ilimitado |

Las modalidades viven en `tags_qr_agency_tiers` y no reemplazan el `plan_id` principal del negocio. Al activar la instancia, `tags_business_addons` conserva el importe base, la cantidad contratada y la vigencia del addon. Para `Agencia100`, la liquidación toma 50 incluidos y ARS 500 por cada QR activo adicional, hasta 100.

Así, un negocio puede conservar Plan Business y contratar QR Agency junto con Store, Resto u otros addons. No se cambia el sistema global de suscripciones.

## 8. Estados

### Agencia

- `draft`: activada pero todavía no operativa.
- `active`: puede administrar y redirigir.
- `suspended`: panel solo lectura; sus QR muestran suspensión controlada según política.
- `cancelled`: sin operación, conservando historial.

### Cliente final

- `active`
- `suspended`
- `archived`

### Asignación

- `active`
- `paused`
- `archived`

El estado operativo del QR continúa reflejándose en `tags_qr_codes.status`, `is_active` y `stop_message` para conservar compatibilidad con el resolver actual.

## 9. Panel de la agencia

### Resumen

- Plan y vigencia.
- QRs utilizados/disponibles.
- Clientes activos.
- Escaneos totales y únicos del período.
- Advertencias al 80 %, 90 % y 100 % del cupo.

### Clientes

- Alta y edición.
- Suspensión y archivo.
- Envío/reenvío de acceso.
- Último acceso.
- Cantidad de QR asignados.
- Vista del panel del cliente con auditoría.

### QRs

- Creación digital.
- Asignación o reasignación controlada.
- Nombre, URL, pausa y mensaje.
- Descarga del QR.
- Última modificación.
- Estadísticas resumidas.

### Estadísticas

- Período configurable.
- Totales y únicos.
- Cliente y QR.
- País, región, ciudad, dispositivo, navegador y sistema operativo.
- Exportaciones en una etapa posterior.

## 10. Validaciones críticas

- URL obligatoria con protocolo `http` o `https`; bloquear esquemas peligrosos.
- Email normalizado y válido.
- Autorización por `agency_id` y `customer_id` en todas las consultas.
- Nunca aceptar un `qrId` sin verificar la asignación.
- Rate limit del pedido de magic link por IP, agencia y email.
- No revelar si un email existe.
- Registrar antes/después en cambios de destino o estado.
- No permitir exceder el cupo por llamadas simultáneas.
- No borrar estadísticas al reasignar o archivar.

## 11. APIs previstas

### Agencia autenticada

- `GET/POST /api/qr-agency/admin/settings`
- `GET/POST/PATCH/DELETE /api/qr-agency/admin/customers`
- `POST /api/qr-agency/admin/customers/send-access`
- `GET/POST/PATCH /api/qr-agency/admin/qrs`
- `POST /api/qr-agency/admin/qrs/assign`
- `POST /api/qr-agency/admin/qrs/pause`
- `GET /api/qr-agency/admin/analytics`

### Cliente final

- `POST /api/qr-agency/public/request-link`
- `GET /api/qr-agency/public/verify`
- `POST /api/qr-agency/public/logout`
- `GET /api/qr-agency/customer/session`
- `GET/PATCH /api/qr-agency/customer/qrs`
- `POST /api/qr-agency/customer/qrs/pause`
- `GET /api/qr-agency/customer/analytics`

Todas las APIs deben devolver JSON controlado, incluso ante cuerpo vacío o errores internos.

## 12. Etapas de implementación

1. Migración, addon y reglas comerciales.
2. Activación de instancia y tarjeta en dashboard.
3. Administración de clientes.
4. Creación/asignación de QRs y control transaccional de cupo.
5. Sublogin, magic links y sesiones.
6. Panel del cliente: edición, pausa y mensaje.
7. Estadísticas y auditoría visible.
8. Vencimientos, gracia y liquidación variable.

Cada etapa se implementará y probará separadamente, esperando aprobación antes de continuar.
