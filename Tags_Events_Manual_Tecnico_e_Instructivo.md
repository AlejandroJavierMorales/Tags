# Tags Events — manual técnico e instructivo operativo

## 1. Descripción

Tags Events permite crear y publicar eventos, charlas, cursos y conversatorios desde la plataforma. El organizador puede recibir inscripciones online, definir cupos, elegir confirmación automática o manual, cobrar mediante transferencia con comprobante o Mercado Pago, emitir una credencial QR y registrar la asistencia.

La integración con la web del prestador se publica en:

- `/{slug-del-prestador}/eventos`
- `/{slug-del-prestador}/eventos/{slug-del-evento}`

La URL técnica anterior `/eventos/{slug-del-evento}` se conserva como compatibilidad y redirige a la URL del prestador cuando existe una publicación activa.

## 2. Requisitos de activación

El negocio debe tener activo el addon `e_events` o `events`. Para inscripciones públicas deben estar aplicadas estas migraciones, en este orden:

1. `database/migrations/2026-10-05-tags-events-addon.sql`
2. `database/migrations/2026-10-05-tags-events-public-registration.sql`
3. `database/migrations/2026-10-05-tags-events-manual-payments.sql`
4. `database/migrations/2026-10-05-tags-events-mercadopago.sql`

Mercado Pago requiere además la variable de entorno `EVENTS_MERCADOPAGO_TOKEN_ENCRYPTION_KEY`. La cuenta de Mercado Pago se configura por negocio; no se comparte el token entre clientes.

## 3. Flujo para crear y publicar un evento

1. Ingresar al panel del negocio y abrir Tags Events.
2. Crear el evento con nombre, descripción, fecha y hora, lugar e imagen de portada si corresponde.
3. Guardar el evento en estado de edición.
4. Abrir la sección de inscripción pública.
5. Definir el slug público, por ejemplo `conversatorio-previsional`.
6. Activar “Aceptar inscripciones”.
7. Elegir el tipo de confirmación:
   - Automática: confirma la inscripción y genera la credencial QR cuando no hay un pago pendiente.
   - Manual: deja la solicitud pendiente para que la organización la revise.
8. Definir el cupo total o dejarlo sin límite.
9. Configurar, si corresponde, fecha de apertura, fecha de cierre, teléfono obligatorio, condiciones y mensaje de confirmación.
10. Elegir la modalidad de pago:
    - Sin pago.
    - Pago manual: se muestran los datos bancarios y el asistente carga un comprobante.
    - Mercado Pago: el asistente es enviado al checkout y el webhook actualiza el pago.
11. Guardar la configuración.
12. Publicar el evento desde Tags Events.
13. Activar “Eventos” dentro de la estructura o módulos visibles de la web del prestador.

Una vez publicado, el evento puede abrirse desde la tarjeta de próximos eventos o directamente desde la URL del prestador.

## 4. Inscripción del asistente

El asistente completa nombre, email, teléfono cuando es obligatorio y acepta las condiciones si fueron configuradas.

El sistema evita duplicar una inscripción vigente para el mismo email y evento. También controla el estado del evento, las fechas de apertura y cierre y el cupo disponible.

Después de enviar el formulario recibe una URL segura de seguimiento. Desde allí puede consultar el estado, cargar un comprobante manual o continuar un pago de Mercado Pago cuando corresponda.

## 5. Confirmación y pagos

### Sin pago

Con confirmación automática, el asistente queda confirmado y recibe su credencial QR. Con confirmación manual, queda pendiente hasta que la organización confirme o rechace la solicitud.

### Pago manual

La organización carga alias, CBU, titular, instrucciones y cualquier dato necesario. El asistente realiza la transferencia y adjunta el comprobante desde su página de seguimiento. El organizador puede aprobar o rechazar el comprobante. El pago no se considera aprobado solamente por haber recibido el archivo.

### Mercado Pago

La cuenta se conecta y configura desde la administración del evento. El asistente inicia el pago desde la página pública. Mercado Pago notifica el resultado mediante el webhook; el estado del pago se actualiza en servidor y no depende de lo que informe el navegador.

## 6. Credencial QR y check-in

Cuando la inscripción queda confirmada, Tags Events genera una credencial QR individual. El código identifica la inscripción y no debe compartirse como si fuera un QR general del evento.

Para acreditar a una persona:

1. Abrir el evento en Tags Events.
2. Ingresar al módulo de scanner/check-in.
3. Escanear la credencial QR o utilizar la búsqueda del asistente.
4. Verificar nombre y estado de la inscripción.
5. Confirmar el ingreso.

El sistema evita registrar dos veces el mismo ingreso y conserva el estado de la acreditación para auditoría.

## 7. Administración durante el evento

Desde el panel se pueden revisar las solicitudes pendientes, confirmadas y rechazadas; consultar datos de asistentes; controlar cupos; resolver pagos manuales; descargar o mostrar credenciales y registrar check-in.

La organización debe resolver primero los pagos pendientes y luego confirmar las inscripciones que correspondan. Rechazar una solicitud libera el lugar ocupado por esa solicitud.

## 8. Cierre del evento

Al finalizar:

1. Revisar la lista de asistentes confirmados.
2. Completar los check-ins pendientes si existe control manual.
3. Consultar pagos rechazados, pendientes o comprobantes sin revisar.
4. Exportar los datos necesarios desde el panel de asistentes.
5. Desactivar la recepción de nuevas inscripciones o dejar pasar la fecha de cierre.
6. Mantener publicado el evento si se desea conservar su página histórica, o despublicarlo si ya no debe aparecer en la web.

Desactivar inscripciones no borra asistentes, pagos, credenciales ni registros de check-in.

## 9. Integración en la web del prestador

La tarjeta de Eventos se muestra solamente cuando:

- el negocio tiene el addon activo;
- existe al menos un evento publicado y activo;
- la inscripción pública está habilitada;
- el evento todavía es visible como próximo.

El cliente puede ordenar el módulo junto con Tienda, Gastronomía, Reservas y Reseñas desde la estructura de la web. También puede editar el nombre del menú, texto superior, título, descripción y cantidad de eventos visibles.

El sitemap del directorio incluye la página de eventos del prestador y las páginas individuales de sus eventos publicados.

## 10. Recomendaciones operativas

- Probar el formulario con un email real antes de compartirlo.
- No confirmar manualmente una inscripción cuyo pago todavía no fue validado.
- No reutilizar la credencial QR de una persona para otra.
- Mantener actualizado el teléfono y el mensaje de contacto del evento.
- Definir cupo y fecha de cierre antes de difundir el enlace.
- Hacer una prueba de check-in con una credencial antes del inicio del evento.
- Para Mercado Pago, probar una inscripción completa después de configurar la cuenta y verificar que el webhook llegue correctamente.

## 11. Diagnóstico rápido

**El evento no aparece en la web:** verificar addon activo, evento publicado, inscripción habilitada y módulo Eventos visible en la estructura de la web.

**La inscripción aparece cerrada:** revisar fecha de apertura, fecha de cierre, estado del evento y cupo disponible.

**No se genera la credencial:** revisar que Tags Events y la configuración de QR del evento estén disponibles y que la inscripción haya quedado confirmada.

**Mercado Pago no permite continuar:** revisar cuenta activa, Access Token, secreto del webhook, moneda ARS y variable `EVENTS_MERCADOPAGO_TOKEN_ENCRYPTION_KEY`.

**El enlace abre la URL técnica:** la ruta anterior es compatible, pero los enlaces nuevos deben generarse desde la pantalla de inscripción pública para utilizar la URL del prestador.

## 12. Referencia técnica

La implementación reutiliza la autenticación, permisos, notificaciones, QR, almacenamiento de imágenes y estructura pública del directorio. No crea un portal separado para cada evento.

Componentes principales:

- Administración: `/dashboard/events/{eventId}` y `/dashboard/events/{eventId}/registration`.
- Página pública de inscripción: `/api/events/public/registration`.
- Estado de inscripción: `/api/events/public/registration/status`.
- Solicitudes administrativas: `/api/events/registration/requests`.
- Configuración: `/api/events/registration/settings`.
- Comprobante manual: `/api/events/public/registration/payment-proof`.
- Pago Mercado Pago: `/api/events/public/registration/mercadopago`.
- Webhook de pago: `/api/events/payments/mercadopago/webhook`.
- Check-in y scanner: APIs existentes de `/api/events/checkin` y `/api/events/scan`.

Las tablas principales del flujo de inscripción son `tags_events`, `tags_event_registration_settings`, `tags_event_attendees`, `tags_event_registrations`, `tags_event_registration_payments` y `tags_event_payment_settings`. La vinculación con el negocio se realiza mediante el evento y el addon activo; la publicación en el directorio utiliza las tablas existentes de listings y site listings.

Las operaciones sensibles se validan en servidor. El navegador no es autoridad para confirmar pagos, modificar cupos, confirmar asistentes ni registrar identidades arbitrarias. Las URLs de seguimiento utilizan tokens aleatorios almacenados como hash.
