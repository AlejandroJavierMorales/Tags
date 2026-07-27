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
