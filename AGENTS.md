<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CONTEXTO DE CONTINUIDAD — PLATAFORMA TAGS

Este archivo resume el contexto funcional y técnico conocido del proyecto para continuar el desarrollo sin repetir una auditoría completa en cada sesión. Debe leerse junto con el código existente. No reemplaza la verificación puntual de archivos antes de modificar código.

## Reglas permanentes de trabajo

- Trabajar siempre sobre la arquitectura y los componentes existentes.
- No inventar APIs, componentes, tablas ni módulos paralelos si ya existe infraestructura reutilizable.
- No hacer refactors innecesarios ni modificar Tags Store al trabajar sobre Tags Resto, Reviews o futuros addons.
- Antes de cambiar archivos, analizar el contrato actual y conservar compatibilidad.
- No instalar librerías ni ejecutar `npm install` sin autorización explícita del usuario.
- No iniciar ni detener servidores de desarrollo sin autorización explícita.
- No modificar la base de datos sin autorización. Si una migración fuera necesaria, entregar el script SQL exacto.
- No declarar claves foráneas contra tablas legacy (`tags_businesses`, `tags_plans`, `tags_directory_sites` u otras preexistentes) suponiendo el tipo de sus PK. Antes de una FK se debe verificar `SHOW CREATE TABLE` en desarrollo y producción y confirmar coincidencia exacta de tipo, tamaño, signo y motor. Si esa verificación no está disponible o las instalaciones difieren, usar columnas indexadas sin FK y mantener la integridad desde el flujo transaccional existente.
- Comunicar cada etapa terminada y esperar aprobación cuando el usuario lo solicite.
- No usar datos falsos ni APIs inventadas para completar funcionalidades.
- Validar cambios con comprobaciones locales no destructivas; no asumir que una compilación o servidor está disponible.



## Ecosistema general

Tags es una plataforma multi-producto para negocios. Un negocio puede tener plan, addons, páginas QR públicas, Portal y módulos operativos.

Conceptos transversales:

- `tags_businesses`: negocio/cliente de la plataforma.
- Usuarios y autenticación: acceso general mediante magic link; existen flujos específicos para plataforma, negocio y personal.
- Dashboard: rutas bajo `app/dashboard/businesses/[id]`.
- Portal: addon que agrupa páginas públicas y aporta header/footer global, rutas públicas y tema global.
- QR/QR-Page: páginas públicas publicadas por slug; utilizan `tags_qr_pages`, secciones, bloques y productos.
- Temas: `tags_qr_page_themes`; una página puede heredar el tema de Portal o marcar un override propio en `global_styles.theme_override`.
- Addons: `tags_business_addons`; la disponibilidad de módulos públicos y administrativos debe estar condicionada por addon y permisos.
- Personal/permisos: Tags Resto posee permisos operativos y perfiles de personal; no asumir que todo usuario puede acceder a todo.
- Notificaciones: existe infraestructura de alertas visuales/sonoras y configuración para habilitarlas o deshabilitarlas.
- Emails/magic links, QR, portal, reviews, builder y estilos comunes deben reutilizarse antes de crear alternativas.

## Tags Store

Tags Store es un producto existente y funcional. No debe romperse al incorporar otros módulos.

Infraestructura relevante:

- Builder Store y su editor declarativo: `app/modules/store/components/admin/builder/StoreBlockEditor.jsx`.
- Definiciones declarativas: `app/modules/store/lib/storeModuleDefinitions` y schemas del builder.
- APIs Store bajo `app/api/store/...`.
- Renderers públicos Store y detalle de producto.
- Pedidos, pagos Mercado Pago, envíos y Zipnova.
- Reviews de Commerce: reseñas por producto comprado, independientes de Tags Reviews de experiencia.

Al reutilizar componentes Store desde otro addon, mantener props y endpoints compatibles. No copiar grandes bloques ni modificar contratos Store salvo que sea imprescindible y aprobado.

## Tags Reviews

Tags Reviews es un addon de experiencia general del negocio.

Incluye:

- formularios configurables;
- preguntas y calificación general;
- umbral positivo;
- invitación a Google Reviews;
- respuestas y métricas;
- administración de formularios;
- moderación de visibilidad pública (`is_public`);
- renderer público y bloque/slider de reseñas.

Commerce Reviews de Store es otro sistema y no debe mezclarse con las respuestas de experiencia.

Tags Resto reutiliza Tags Reviews cuando el addon está asignado. El CTA de Resto valida pedido y contacto, genera token de review y permite volver al pedido. La pantalla del pedido muestra invitación a calificar y, después de responder, agradecimiento con estrellas.

## Tags Resto — estado funcional

Tags Resto es el módulo operativo para restaurantes, basado en sesiones, pedidos, cocina, mozos, caja, delivery, personal, reviews y builder público.

Rutas públicas principales:

- `/p/[slug]`: página pública del restaurante.
- `/p/[slug]/order/[sessionToken]`: seguimiento del pedido.
- páginas de producto y componentes públicos de carta, carrito, drawer, pedido, chat y seguimiento delivery.

Rutas administrativas principales:

- `/dashboard/businesses/[id]/resto`: dashboard principal.
- `/resto/orders`: pedidos activos.
- `/resto/orders/history`: historial.
- `/resto/orders/[orderId]`: detalle del pedido.
- `/resto/kitchen`: cocina.
- `/resto/waiter`: mozo.
- `/resto/tables`: mesas/estados en tiempo real.
- `/resto/locations`: sectores y mesas.
- `/resto/cash`: caja.
- `/resto/delivery`: delivery y repartidores.
- `/resto/staff`: personal/permisos.
- `/resto/settings`: configuración operativa.
- `/resto/builder`: builder público del restaurante.

Modelo de estados acordado:

- Pedido: pendiente de enviar, en cocina, listo para entregar, entregado, pidiendo cuenta, pagado, cerrado, cancelado.
- Ítem: `pending`, `sent`, `ready`, `served`, `cancelled`.
- El estado del pedido se calcula a partir de ítems y sesión; las pantallas no deben inventar interpretaciones diferentes.
- Un pedido está “en cocina” si tiene al menos un ítem que requiere preparación y todavía no está `ready`/`served`/`cancelled`.
- Productos sin preparación no deben contar como platos pendientes de cocina, aunque sí pueden quedar pendientes de entrega.

Tablas Resto importantes:

- `tags_stores` con `app_type = 'resto'`.
- `tags_qr_pages` asociada al store.
- `tags_resto_sessions`.
- `tags_resto_session_items`.
- `tags_resto_service_requests` para llamadas al personal y solicitudes de cuenta.
- `tags_resto_order_messages` para chat cliente-restaurante.
- tablas de locations/mesas/QR.
- tablas de caja, movimientos, pagos, personal, auditoría y delivery.

APIs Resto importantes:

- `/api/resto/public/orders/create`, `get`, `cancel`, `items/update`, `call-waiter`, `request-bill`, `messages`.
- `/api/resto/admin/orders/list`, `get`, `status`, `payment`, `items/update`, `messages`, `send-to-kitchen`.
- `/api/resto/admin/kitchen/...`.
- `/api/resto/admin/waiter/...`.
- `/api/resto/admin/cash/...`.
- `/api/resto/admin/delivery/...`.
- `/api/resto/admin/staff/...`.
- `/api/resto/admin/builder/...`.

La mensajería pública y administrativa debe tolerar cuerpos vacíos/malformados y devolver JSON controlado; no usar `await req.json()` sin manejo cuando una petición pueda llegar abortada.

## Builder y temas

El builder público de Resto reutiliza `StoreBlockEditor` y definiciones declarativas. No debe volver a un editor JSON para usuarios finales.

Características actuales:

- secciones y bloques ordenables;
- visibilidad individual;
- edición declarativa de textos, colores, tipografías, imágenes, estilos y animaciones;
- guardado explícito sin recarga completa;
- tema Portal heredable;
- tema propio de página mediante las APIs existentes `/api/qr-page/themes/list`, `/apply`, `/reset`;
- la selección de tema debe confirmarse con botón Guardar.

Regla de herencia:

- Portal define tema global para sus páginas hijas sin override.
- Una página/addon puede seleccionar tema propio y queda marcada con `global_styles.theme_override = true`.
- Cambiar Portal no debe sobrescribir páginas con override.
- Resto, Store, Reviews, QR genérico y detalle público deben resolver Portal + override de forma consistente.
- Portal puede mostrar su header/footer global; cada addon conserva su header/footer propio si sus bloques están visibles y el builder lo permite.

## Delivery

La pantalla `/resto/delivery` administra entregas, repartidores, estados, cobros, rendiciones y comisiones.

La API devuelve campos como `total`, `paid_total`, `amount_to_collect`, `collected_amount`, `remitted_amount` y `commission_amount`.

La tarjeta de delivery debe ofrecer dirección, teléfono, detalle, acceso al pedido y enlace práctico a Google Maps.

La pantalla de entregas muestra resumen por pedido y totales de monto, comisión, rendición pendiente, rendido y saldo de comisión.

## Próximo módulo: Tags Reservas / Tags Turnos

El siguiente producto será un motor genérico de reservas. No modelar rubros específicos. El núcleo debe modelar recursos configurables.

Debe servir para médicos, odontólogos, peluquerías, barberías, estéticas, talleres, estudios, psicólogos, kinesiólogos, gimnasios, canchas, salones, restaurantes, hoteles, alquileres y otros negocios.

Conceptos centrales:

- recurso: persona, cancha, mesa, consultorio, box, vehículo, equipo, sala, cabina, puesto, instructor, profesional, etc.;
- disponibilidad del recurso;
- horarios, duración, intervalos, capacidad;
- bloqueos, feriados, descansos y excepciones;
- agenda y reglas configurables;
- clientes que reservan, cancelan, reprograman y confirman;
- recordatorios;
- negocio que administra recursos, agendas, calendario, aprobaciones, rechazos y bloqueos.

El módulo debe integrarse con autenticación, dashboard, Portal, addons, permisos, QR/QR-Page, Tags ID, Tags Reviews, notificaciones, emails, builder, estilos y APIs comunes. En el futuro debe admitir pagos/señas, suscripciones, WhatsApp, Google Calendar, Outlook y Apple Calendar sin romper el modelo inicial.

## Prompt inicial de Tags Reservas

Antes de escribir código, realizar un documento técnico completo con:

- arquitectura;
- módulos reutilizables;
- tablas y relaciones;
- APIs;
- componentes públicos y administrativos;
- flujo completo de reserva;
- panel administrativo;
- panel público;
- configuración;
- permisos;
- addon y Portal;
- integración con Resto, Store, Reviews y QR;
- roadmap por etapas.

No escribir código hasta que el usuario apruebe el diseño. No crear arquitectura paralela ni tablas prematuras. Primero identificar archivos y contratos existentes que puedan reutilizarse.

## Tags Turnos — funcionalidades pendientes registradas el 2026-08-03

Estas funcionalidades quedan expresamente documentadas como pendientes para una etapa posterior. No se encuentran autorizadas para implementación hasta que el usuario las solicite nuevamente.

- Reportes administrativos y operativos del módulo de Turnos.
- Monetización de reservas y servicios.
- Registro y administración de pagos manuales.
- Integración de pagos con Mercado Pago.
- Estados de cuenta por cliente, conservando el seguimiento por `customer_id`.
- Builder público propio de Tags Turnos, integrado con la arquitectura y modalidad de administración utilizada por Tags Resto.
- Bloque público de header configurable.
- Bloque público de footer configurable.
- Bloque público para que el cliente acceda a Tags Reviews y deje su reseña.
- Bloque público para mostrar reseñas, con filtros configurables.
- Integración de los bloques de reseñas con Tags Reviews, sin crear un sistema paralelo de opiniones.

Cuando se retome este alcance, primero se deberán revisar los contratos existentes de pagos, Mercado Pago, estados de cuenta, Tags Reviews, Portal y builder de Tags Resto. No modificar Tags Resto ni Tags Store para implementar estas funcionalidades sin autorización explícita.

# Tags Guest_Experience

## Diseño aprobado y contexto registrado el 2026-08-03

Tags Guest Experience será un addon para alojamientos temporarios como cabañas, hoteles, hosterías, complejos y establecimientos similares. Su primera implementación y referencia funcional será **Cabañas Ecos del Valle**.

El producto público se presentará como **Mi Estadía** y operará como una SPA mobile-first. El huésped accederá mediante un enlace seguro enviado por email o WhatsApp. En el caso de Ecos del Valle, la URL exterior esperada será `cabanasecosdelvalle.com.ar/mi-estadia`; Cloudflare resolverá esa ruta hacia la aplicación interna correspondiente sin exponer al huésped el dominio de Tags.

La ruta canónica interna prevista es `/p/[slug]/mi-estadia`. También podrá reconocerse `guest_experience` como código técnico del addon, pero no debe exponerse como nombre principal al huésped.

## Principio de arquitectura

Guest Experience es el orquestador de la experiencia de la estadía. No debe copiar ni reemplazar los motores existentes de Store, Resto, Turnos o Reviews.

- Guest Experience administra estadías, huéspedes, accesos, pre-check-in, información útil, WiFi, beneficios, cuenta de la estadía, mensajes y solicitudes.
- Tags Turnos conserva servicios, recursos, horarios, capacidad y reservas.
- Tags Store conserva catálogo, productos, carrito, pedidos y pagos de tienda.
- Tags Resto conserva carta, pedidos, preparación y entrega.
- Tags Reviews conserva formularios, respuestas, reputación e invitaciones a reseñar.
- Los addons se mostrarán mediante componentes embebibles dentro de la SPA, sin `iframe`, sin headers o footers duplicados y sin sacar al huésped de Mi Estadía.
- Las páginas públicas normales de Store, Resto y Turnos deben continuar funcionando sin cambios de contrato.

## Acceso y sesión del huésped

1. El establecimiento crea o importa una estadía.
2. Asocia huésped principal, acompañantes, unidad y fechas.
3. Envía una invitación por email, WhatsApp o copia manual del enlace.
4. El enlace contiene un token aleatorio de un solo uso almacenado únicamente como hash.
5. Al validarlo se crea una sesión segura mediante cookie `httpOnly`, `secure` en producción y `sameSite=lax`.
6. El huésped es redirigido a `/p/[slug]/mi-estadia` sin conservar el token en la URL.
7. La sesión puede permanecer activa durante la estadía y un período posterior configurable para consultar consumos, comprobantes y completar la reseña.

La identidad transversal no debe depender solamente del email. Cada acción debe quedar relacionada explícitamente con `stay_id` y `guest_id`. Cuando se utilice otro addon también se registrará la relación con su identificador nativo, por ejemplo `booking_id`, `order_id` o token de reseña.

## SPA pública Mi Estadía

Encabezado inicial:

- logo del establecimiento;
- nombre comercial;
- imagen de portada;
- mensaje de bienvenida personalizado;
- título destacado **Mi Estadía**;
- nombre del huésped;
- unidad asignada;
- fechas de ingreso y egreso;
- estado de la estadía.

Secciones previstas:

- Inicio y resumen de actividad.
- Pre-Check-in.
- Mi alojamiento y datos de la estadía.
- WiFi por red o sector.
- Información útil y normas.
- Beneficios y cupones.
- Actividades y servicios de Tags Turnos.
- Mis reservas de Turnos.
- Tienda de Tags Store.
- Carrito, pedidos y seguimiento de Store.
- Gastronomía, desayuno y pedidos de Tags Resto cuando esté habilitado.
- Mensajes y solicitudes al establecimiento.
- Cuenta de la estadía.
- Invitación a Tags Reviews.

La SPA utilizará navegación cliente y URLs internas representativas, sin recargar la aplicación completa.

## Pre-Check-in y Libro de Pasajeros

El formulario debe ser configurable y admitir guardado parcial, envío y revisión administrativa. Como mínimo podrá contener:

- nombre y apellido;
- documento o pasaporte;
- nacionalidad;
- fecha de nacimiento;
- domicilio;
- teléfono y email;
- acompañantes;
- vehículo y patente;
- horario estimado de llegada;
- observaciones;
- aceptación de políticas;
- consentimiento de privacidad.

Estados: `draft`, `submitted`, `observed`, `approved` y `rejected`. Los datos sensibles requieren permisos específicos y auditoría.

## WiFi e información útil

El establecimiento podrá configurar múltiples redes con nombre, clave, sector, instrucciones, orden y visibilidad. También podrá cargar información de check-in/check-out, estacionamiento, emergencias, residuos, limpieza, horarios, normas y contactos internos.

## Beneficios y cupones

Cada beneficio podrá definir comercio, nombre, imagen, descripción, condiciones, tipo de descuento o beneficio, ubicación, mapa, contactos, vigencia y cantidad disponible por huésped o estadía.

Estados del cupón: `available`, `issued`, `redeemed`, `expired` y `cancelled`. Cada emisión debe poseer código único, opción de QR, fecha, huésped, estadía y registro de canje. Los límites de uso deben validarse en servidor y quedar auditados.

## Tags Turnos embebido

Para Ecos del Valle se prevé una instancia de Tags Turnos con múltiples servicios:

- Sauna.
- Alquiler de bicicletas.
- Alquiler de kayak.

Ejemplos de recursos:

- Sesión o cabina de sauna con capacidad configurada.
- Bicicletas R29 con capacidad equivalente a las unidades disponibles.
- Kayaks con capacidad equivalente a las unidades disponibles.

El huésped reservará dentro de Mi Estadía sin volver a identificarse. Las reservas realizadas aparecerán en `Mis reservas` dentro de la SPA. La integración debe conservar `turnos_id`, `booking_id`, `stay_id` y `guest_id`; no debe reconstruir la relación únicamente mediante email.

## Tags Store embebido

Para Ecos del Valle se prevén inicialmente categorías como:

- Almacén.
- Regalería.

Store debe disponer de un contexto embebido para mostrar categorías, productos, detalle, carrito, confirmación y pedidos dentro de la SPA. Debe ocultar estructura pública duplicada y permitir `Entrega en la cabaña`, completando huésped, contacto y unidad desde la estadía.

## Tags Resto embebido

Si el establecimiento ofrece comidas o desayuno mediante Tags Resto, el huésped podrá consultar la carta, realizar pedidos y seguirlos dentro de Mi Estadía. La modalidad preferida será `Entrega en la cabaña`, sin solicitar una dirección externa. Podrá reutilizar infraestructura de delivery, pero no debe obligar a usar mapas o repartidores cuando la entrega sea interna.

Si no existe Resto activo, el desayuno opcional podrá implementarse como una solicitud propia de la estadía con fecha, horario, cantidad y observaciones.

## Mensajería, solicitudes y alertas

La estadía tendrá una conversación entre huésped y establecimiento con mensajes, remitente, estado de lectura y fechas. Las solicitudes podrán clasificarse como limpieza, mantenimiento, desayuno, ropa blanca, consulta general u otras categorías configurables.

La administración mostrará mensajes no leídos y solicitudes abiertas. La SPA y el panel deberán actualizarse sin F5 mediante consulta periódica o el mecanismo de tiempo real que se adopte. Email y WhatsApp actuarán como canales adicionales, no como fuente principal del historial.

## Tags Reviews

Antes del egreso o después del check-out se mostrará una invitación a calificar la experiencia. Guest Experience generará o solicitará un token de Tags Reviews relacionado con la estadía. No se creará un sistema paralelo de reseñas. La tarjeta deberá reconocer si la reseña ya fue respondida y respetar la configuración existente de invitación a Google Reviews.

## Cuenta de la estadía

Cada estadía tendrá una cuenta corriente única. Todo consumo con costo deberá poder incorporarse automáticamente o de forma manual.

Orígenes de cargos previstos:

- alojamiento o conceptos manuales;
- productos de Tags Store;
- pedidos de Tags Resto;
- desayuno opcional;
- servicios o reservas de Tags Turnos;
- beneficios que impliquen cargo;
- daños, adicionales, tasas o ajustes autorizados;
- descuentos y bonificaciones.

La cuenta debe registrar movimientos inmutables, no solamente un total recalculado. Cada movimiento contendrá origen, referencia externa, descripción, cantidad, importe unitario, total, moneda, fecha, responsable y estado.

Tipos de movimiento iniciales:

- `charge`: cargo;
- `discount`: descuento;
- `adjustment`: ajuste positivo o negativo;
- `payment`: pago;
- `refund`: devolución;
- `void`: anulación compensatoria de otro movimiento.

No se borrarán movimientos confirmados. Los errores se corregirán mediante anulación o contramovimiento para conservar auditoría.

Estados de la cuenta: `open`, `pending_settlement`, `paid`, `partially_paid`, `closed` y `disputed`.

Primera etapa de pagos:

- efectivo;
- débito;
- crédito presencial;
- transferencia;
- otro medio manual configurable;
- referencia o comprobante;
- usuario que registró el cobro;
- fecha y observaciones.

Etapa posterior:

- Mercado Pago;
- enlaces de pago;
- señas;
- pagos parciales online;
- webhooks e idempotencia;
- conciliación;
- comprobantes.

Antes del check-out, el huésped podrá consultar cargos, descuentos, pagos y saldo. La política del establecimiento decidirá si el check-out puede completarse con saldo pendiente. Los cargos provenientes de addons deben vincularse mediante identificadores nativos y claves de idempotencia para impedir duplicados.

## Administración

Solapas propuestas:

- Resumen.
- Estadías.
- Huéspedes.
- Pre-Check-in / Libro de Pasajeros.
- Unidades.
- Beneficios.
- WiFi e información.
- Mensajes y solicitudes.
- Cuenta y pagos.
- Integraciones.
- Diseño de Mi Estadía.
- Configuración.
- Reportes en una etapa posterior.

El resumen mostrará llegadas, salidas, pre-check-ins pendientes, estadías activas, mensajes sin leer, solicitudes abiertas, cupones emitidos/canjeados, consumos recientes y saldos pendientes.

## Addons e integraciones

El addon principal tendrá código técnico provisional `guest_experience`. Antes de activar integraciones se verificará en `tags_business_addons` que los addons estén activos y vigentes.

Integraciones opcionales:

- `store`;
- `resto`;
- `turnos`;
- `client_reviews`;
- `portal_public`;
- QR/QR-Page.

Una integración inactiva se ocultará sin romper el resto de la SPA. Guest Experience podrá exigir determinados addons según el plan comercial, pero no debe asumir su disponibilidad sin verificarla.

## Modelo conceptual de datos

Los nombres deberán confirmarse contra la base real antes de crear SQL. Entidades previstas:

- `tags_guest_apps`;
- `tags_guest_units`;
- `tags_guest_stays`;
- `tags_guest_people`;
- `tags_guest_stay_people`;
- `tags_guest_access_tokens`;
- `tags_guest_sessions` si la sesión persistente requiere registro servidor;
- `tags_guest_precheckins`;
- `tags_guest_wifi_networks`;
- `tags_guest_information_items`;
- `tags_guest_benefits`;
- `tags_guest_benefit_locations`;
- `tags_guest_coupons`;
- `tags_guest_coupon_redemptions`;
- `tags_guest_messages`;
- `tags_guest_service_requests`;
- `tags_guest_integrations`;
- `tags_guest_external_links` para relacionar reservas, pedidos y reseñas con estadías;
- `tags_guest_accounts`;
- `tags_guest_account_entries`;
- `tags_guest_payments`;
- `tags_guest_notification_deliveries`;
- `tags_guest_audit_log`.

## Route map público

Rutas SPA visibles:

- `/p/[slug]/mi-estadia` — inicio y resumen.
- `/p/[slug]/mi-estadia/pre-checkin` — pre-check-in.
- `/p/[slug]/mi-estadia/alojamiento` — datos de la estadía y unidad.
- `/p/[slug]/mi-estadia/wifi` — redes e información.
- `/p/[slug]/mi-estadia/beneficios` — beneficios.
- `/p/[slug]/mi-estadia/beneficios/[couponId]` — cupón emitido.
- `/p/[slug]/mi-estadia/actividades` — Turnos embebido.
- `/p/[slug]/mi-estadia/reservas` — reservas del huésped.
- `/p/[slug]/mi-estadia/tienda` — Store embebida.
- `/p/[slug]/mi-estadia/carrito` — carrito.
- `/p/[slug]/mi-estadia/pedidos` — pedidos de Store/Resto.
- `/p/[slug]/mi-estadia/gastronomia` — Resto embebido.
- `/p/[slug]/mi-estadia/mensajes` — conversación y solicitudes.
- `/p/[slug]/mi-estadia/cuenta` — estado de cuenta y pagos.
- `/p/[slug]/mi-estadia/resena` — invitación o acceso a Tags Reviews.

La navegación debe permanecer dentro del shell SPA aunque la URL cambie. Cloudflare podrá exponerlas bajo el dominio propio, por ejemplo `cabanasecosdelvalle.com.ar/mi-estadia`.

## Route map administrativo

- `/dashboard/businesses/[id]/guest-experience` — selección/resumen de instancia.
- `/dashboard/businesses/[id]/guest-experience/stays` — estadías.
- `/dashboard/businesses/[id]/guest-experience/stays/[stayId]` — ficha integral.
- `/dashboard/businesses/[id]/guest-experience/guests` — huéspedes.
- `/dashboard/businesses/[id]/guest-experience/units` — unidades.
- `/dashboard/businesses/[id]/guest-experience/precheckin` — Libro de Pasajeros.
- `/dashboard/businesses/[id]/guest-experience/benefits` — beneficios y comercios.
- `/dashboard/businesses/[id]/guest-experience/coupons` — cupones y canjes.
- `/dashboard/businesses/[id]/guest-experience/wifi` — redes e información.
- `/dashboard/businesses/[id]/guest-experience/messages` — conversaciones y solicitudes.
- `/dashboard/businesses/[id]/guest-experience/accounts` — cuentas y saldos.
- `/dashboard/businesses/[id]/guest-experience/accounts/[stayId]` — cuenta de una estadía.
- `/dashboard/businesses/[id]/guest-experience/integrations` — Store, Resto, Turnos y Reviews.
- `/dashboard/businesses/[id]/guest-experience/design` — diseño de Mi Estadía.
- `/dashboard/businesses/[id]/guest-experience/settings` — configuración.

## Route map de APIs

Prefijos:

- `/api/guest-experience/admin/...` para administración autenticada.
- `/api/guest-experience/public/...` para operaciones de la SPA con sesión de huésped.
- `/api/workspace/apps/guest-experience/activate` para activación controlada del addon.

Grupos administrativos previstos:

- `settings`, `stays`, `guests`, `units`, `precheckin`, `benefits`, `coupons`, `wifi`, `information`, `messages`, `requests`, `accounts`, `payments`, `integrations`, `design`, `invitations` y `audit`.

Grupos públicos previstos:

- `session`, `stay`, `precheckin`, `wifi`, `information`, `benefits`, `coupons`, `turnos`, `store`, `resto`, `messages`, `requests`, `account` y `reviews`.

Las APIs públicas resolverán siempre la estadía desde la sesión segura. No aceptarán `stay_id`, `guest_id`, importes ni `business_id` arbitrarios como autoridad enviada por el navegador.

## Permisos previstos

- `guest.dashboard.view`;
- `guest.stays.view` y `guest.stays.manage`;
- `guest.guests.view` y `guest.guests.manage`;
- `guest.precheckin.view` y `guest.precheckin.manage`;
- `guest.units.manage`;
- `guest.benefits.manage`;
- `guest.coupons.redeem`;
- `guest.wifi.manage`;
- `guest.messages.view` y `guest.messages.reply`;
- `guest.requests.manage`;
- `guest.accounts.view` y `guest.accounts.manage`;
- `guest.payments.register`;
- `guest.integrations.manage`;
- `guest.design.manage`;
- `guest.settings.manage`;
- `guest.audit.view`.

## Roadmap de desarrollo

### Etapa 1 — núcleo

- addon y activación;
- instancia de Ecos del Valle;
- modelo base de huéspedes, unidades y estadías manuales;
- acceso seguro por enlace;
- shell SPA y encabezado de Mi Estadía;
- permisos y auditoría base.

### Etapa 2 — experiencia esencial

- pre-check-in;
- WiFi;
- información útil;
- mensajería y solicitudes;
- alertas administrativas.

### Etapa 3 — beneficios

- comercios;
- beneficios;
- emisión, visualización y canje de cupones.

### Etapa 4 — integraciones embebidas

- Tags Turnos y listado de reservas;
- Tags Store, carrito y pedidos;
- Tags Resto y entrega en la cabaña;
- contexto firmado y relaciones explícitas con la estadía.

### Etapa 5 — cuenta de la estadía

- cargos manuales y automáticos;
- descuentos y ajustes;
- pagos presenciales;
- estado de cuenta público;
- saldo y control previo al check-out.

### Etapa 6 — Reviews y diseño

- Tags Reviews;
- orden y visibilidad de secciones;
- apariencia, portada, logo y tema;
- integración con Portal.

### Etapa 7 — pagos online y reportes

- Mercado Pago;
- conciliación;
- reportes operativos, comerciales y de consumo.

### Etapa 8 — motor de reservas del alojamiento

- inventario y tipos de unidad;
- disponibilidad;
- temporadas y tarifas;
- reservas directas;
- señas y cancelaciones;
- calendario de ocupación;
- futuras integraciones con canales externos.

## Restricciones para la implementación

- No comenzar código ni SQL hasta que el usuario apruebe este diseño y route map.
- No modificar la base de datos sin entregar y recibir autorización para el SQL exacto.
- No ejecutar `npm run build`; el usuario lo ejecutará cuando corresponda.
- No instalar dependencias ni iniciar o detener servidores sin autorización.
- No modificar contratos de Store, Resto, Turnos o Reviews sin necesidad demostrada y aprobación explícita.
- Cada componente frontend nuevo tendrá su propio archivo CSS con nombres exclusivos de Guest Experience.
- Reutilizar `showAlert`, `TagsSpinner`, autenticación, emails, notificaciones, Portal, builders y componentes existentes antes de crear alternativas.
- Implementar por etapas verificables; no dejar migraciones ni operaciones a mitad de ejecución.





# Diseño preliminar anterior de Tags Guest Experience — reemplazado

> Esta sección se conserva únicamente como antecedente. El diseño normativo y el route map vigentes son los documentados arriba bajo `# Tags Guest_Experience`, con fecha 2026-08-03.

Sí, es totalmente implementable. Lo plantearía como un addon nuevo llamado provisionalmente Tags Guest o Mi Estadía, cuya función es coordinar toda la
  experiencia del huésped sin duplicar Store, Resto, Turnos ni Reviews.

  ## 1. Alcance inicial

  La primera etapa no incluiría todavía el motor comercial completo de reservas hoteleras. Sí necesita un registro mínimo de estadías para saber:

  - Quién es el huésped.
  - En qué unidad se aloja.
  - Fecha de ingreso y egreso.
  - Cantidad de pasajeros.
  - Estado de la estadía.
  - Qué funcionalidades tiene habilitadas.
  - Qué beneficios utilizó.

  La reserva podrá cargarse manualmente desde administración. El motor de disponibilidad, tarifas y reservas online quedará para la segunda etapa.

  ## 2. Acceso del huésped

  El establecimiento crea la estadía y envía una invitación por:

  - Email.
  - WhatsApp, cuando exista un proveedor configurado.
  - Copia manual del enlace.

  El enlace contendrá un token seguro de un solo uso. Al validarlo:

  1. Se comprueba que pertenece a una estadía vigente.
  2. Se crea una sesión segura mediante cookie httpOnly.
  3. Se redirige a /p/[slug]/mi-estadia.
  4. El token desaparece de la URL.

  La sesión podrá mantenerse durante toda la estadía y un período configurable posterior para completar la reseña.

  ## 3. SPA pública “Mi Estadía”

  La pantalla será mobile-first y funcionará como SPA, sin recargas completas.

  Encabezado:

  - Logo.
  - Nombre del establecimiento.
  - Imagen de portada.
  - Bienvenida personalizada.
  - Título destacado Mi Estadía.
  - Nombre del huésped.
  - Fechas de ingreso y egreso.
  - Unidad asignada, cuando corresponda.

  Navegación principal mediante tarjetas o accesos:

  - Pre-Check-in.
  - Información de WiFi.
  - Beneficios.
  - Tienda.
  - Gastronomía y desayuno.
  - Reservar servicios.
  - Mensajes.
  - Información útil.
  - Calificar la experiencia.

  Las secciones se mostrarán según configuración, estado de la estadía y addons activos.

  ## 4. Pre-Check-in

  Formulario configurable por establecimiento:

  - Nombre y apellido.
  - Documento o pasaporte.
  - Nacionalidad.
  - Fecha de nacimiento.
  - Domicilio.
  - Teléfono y email.
  - Datos de acompañantes.
  - Vehículo y patente.
  - Horario estimado de llegada.
  - Observaciones.
  - Aceptación de políticas.
  - Firma o conformidad, en una etapa posterior.

  Debe admitir:

  - Guardado parcial.
  - Envío definitivo.
  - Revisión administrativa.
  - Estados: pendiente, incompleto, enviado, observado y aprobado.
  - Uso posterior como Libro de Pasajeros.
  - Protección específica de información sensible.

  ## 5. WiFi e información útil

  El administrador podrá crear redes por sectores:

  - Nombre del sector.
  - Nombre de red.
  - Contraseña.
  - Indicaciones.
  - Horarios o restricciones.
  - Orden y visibilidad.

  Ejemplos: recepción, cabañas, piscina, restaurante o salón común.

  También conviene incorporar información útil:

  - Horarios.
  - Normas.
  - Emergencias.
  - Check-out.
  - Estacionamiento.
  - Residuos.
  - Contactos internos.

  ## 6. Beneficios y cupones

  Cada beneficio tendrá:

  - Comercio.
  - Logo o imagen.
  - Descripción.
  - Condiciones.
  - Tipo y valor del beneficio.
  - Dirección.
  - Ubicación en mapa.
  - Teléfono, WhatsApp y redes.
  - Vigencia.
  - Cantidad disponible por estadía o huésped.
  - Instrucciones de uso.

  Ciclo del cupón:

  1. Disponible.
  2. Generado por el huésped.
  3. Presentado al comercio.
  4. Canjeado.
  5. Deshabilitado.
  6. Vencido o cancelado.

  Cada cupón debe tener código único y, preferentemente, QR. El canje debe quedar auditado. Podrá permitirse uno o varios usos según la definición del
  beneficio.

  ## 7. Store, Resto y desayuno

  Mi Estadía no debe copiar tiendas ni cartas.

  - Si existe Tags Store activo, muestra acceso a la tienda correspondiente.
  - Si existe Tags Resto, permite pedidos gastronómicos.
  - Debe conservarse una forma de volver a Mi Estadía.
  - El huésped puede transferirse mediante un token firmado para no volver a escribir sus datos.

  El desayuno puede resolverse de dos formas:

  - Como pedido de Resto/Store si el establecimiento usa esos módulos.
  - Como solicitud interna de la estadía si solamente necesita cantidad, horario y observaciones.

  ## 8. Tags Turnos

  Se mostrarán las instancias de Turnos habilitadas para huéspedes:

  - Bicicletas.
  - Kayaks.
  - Sauna.
  - Masajes.
  - Excursiones.
  - Otros servicios.

  Mi Estadía enviará al huésped al turnero seleccionado con identidad y retorno seguro. La reserva seguirá siendo responsabilidad de Tags Turnos.

  No se duplicarán recursos, capacidades, horarios ni reservas dentro de Guest.

  ## 9. Mensajería y alertas

  Conversación vinculada a la estadía:

  - Mensajes huésped–establecimiento.
  - Mensajes leídos/no leídos.
  - Fecha, autor y adjuntos en una etapa posterior.
  - Cierre automático al finalizar el período permitido.
  - Alertas administrativas.
  - Notificaciones por email y eventualmente WhatsApp.
  - Actualización periódica o tiempo real sin F5.

  También debe admitir solicitudes categorizadas:

  - Limpieza.
  - Mantenimiento.
  - Desayuno.
  - Toallas o ropa blanca.
  - Consulta general.
  - Emergencia no médica.

  ## 10. Tags Reviews

  Antes del check-out o después de la salida aparecerá la invitación a calificar.

  - Se genera un token de Tags Reviews asociado a la estadía.
  - No se crea otro sistema de reseñas.
  - La tarjeta cambia de estado una vez respondida.
  - Puede configurarse cuándo aparece.
  - Puede ofrecer primero una encuesta interna y luego Google Reviews, según la configuración existente.

  ## 11. Administración

  Solapas propuestas:

  - Resumen.
  - Estadías.
  - Huéspedes.
  - Pre-Check-in / Libro de Pasajeros.
  - Unidades.
  - Beneficios.
  - WiFi e información.
  - Mensajes y solicitudes.
  - Integraciones.
  - Diseño de la experiencia.
  - Configuración.
  - Reportes, posteriormente.

  El dashboard principal mostraría:

  - Llegadas próximas.
  - Salidas próximas.
  - Pre-check-ins pendientes.
  - Mensajes sin leer.
  - Solicitudes abiertas.
  - Cupones generados y canjeados.
  - Estadías activas.
  - Invitaciones enviadas o pendientes.

  ## 12. Modelo conceptual de datos

  Nuevas entidades específicas:

  - guest_apps: configuración de la instancia.
  - guest_units: unidades básicas del alojamiento.
  - guest_stays: estadías.
  - guest_stay_guests: huéspedes y acompañantes.
  - guest_access_tokens: invitaciones y sesiones.
  - guest_precheckins: formulario y estado.
  - guest_wifi_networks.
  - guest_information_items.
  - guest_benefits.
  - guest_benefit_locations.
  - guest_coupons.
  - guest_coupon_redemptions.
  - guest_messages.
  - guest_service_requests.
  - guest_addon_links: instancias de Store, Resto, Turnos y Reviews habilitadas.
  - guest_notification_deliveries.
  - guest_audit_log.

  Los nombres definitivos se validarían contra las convenciones reales antes de escribir SQL.

  ## 13. Addons e integraciones

  Addon principal nuevo:

  - guest o guest_experience.
  - Una o varias instancias según el modelo comercial que se defina.

  Integraciones opcionales:

  - store.
  - resto.
  - turnos.
  - client_reviews.
  - Portal.
  - QR-Page.

  Al activar o configurar cada integración se debe comprobar en tags_business_addons que esté activa y vigente. Si deja de estar disponible, se oculta esa
  función sin romper la SPA completa.

  ## 14. Permisos

  Permisos mínimos:

  - Ver estadías.
  - Crear y editar estadías.
  - Administrar huéspedes.
  - Consultar información sensible de pre-check-in.
  - Aprobar pre-check-in.
  - Administrar unidades.
  - Administrar beneficios.
  - Canjear cupones.
  - Administrar WiFi e información.
  - Responder mensajes.
  - Resolver solicitudes.
  - Configurar integraciones.
  - Administrar diseño.
  - Enviar invitaciones.

  Las acciones sensibles deben quedar auditadas.

  ## 15. Segunda etapa: motor de alojamiento

  Quedaría separado del primer lanzamiento:

  - Inventario de unidades.
  - Tipos de alojamiento.
  - Capacidad y características.
  - Disponibilidad desde/hasta.
  - Tarifas y temporadas.
  - Restricciones.
  - Reservas directas.
  - Pagos y señas.
  - Cancelaciones.
  - Cambios de unidad.
  - Calendario de ocupación.
  - Integración futura con canales externos.

  La entidad guest_stays debería prepararse para vincularse posteriormente con una reserva hotelera sin depender de ella inicialmente.

  ## Roadmap recomendado

  1. Núcleo del addon, configuración, unidades básicas, estadías manuales y acceso seguro.
  2. SPA con portada, pre-check-in, WiFi e información útil.
  3. Beneficios, cupones y canjes.
  4. Mensajería, solicitudes y alertas.
  5. Integraciones con Store, Resto y Turnos.
  6. Integración con Tags Reviews.
  7. Diseño configurable y Portal.
  8. Reportes.
  9. Motor completo de reservas del alojamiento.
