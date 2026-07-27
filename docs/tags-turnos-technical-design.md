# Tags Turnos — diseño técnico propuesto

Estado: propuesta para revisión. No implementado.

Fecha: 2026-07-27

## 1. Objetivo y decisión de alcance

Tags Turnos será un addon genérico para reservar servicios y recursos en intervalos de tiempo. El dominio no se modelará con conceptos propios de un rubro como “médico”, “peluquero”, “cancha” o “mecánico”, sino con cuatro conceptos estables:

- servicio: lo que el cliente reserva;
- recurso: aquello cuya disponibilidad limita la reserva;
- agenda: reglas que producen disponibilidad;
- reserva: compromiso temporal entre cliente, servicio y recursos asignados.

El mismo núcleo debe cubrir:

- profesionales y consultorios;
- peluquería, barbería, estética, spa y kinesiología;
- talleres mecánicos, boxes, técnicos y equipamiento;
- canchas de tenis, pádel y fútbol;
- clases y actividades de gimnasio con cupos;
- cabalgatas, guías, caballos o vehículos;
- salas, puestos, cabinas y equipamiento alquilable por horario;
- reservas de mesa de restaurante, como integración futura y no como reemplazo de las sesiones de Tags Resto.

### Núcleo común y perfiles de actividad

La selección inicial del tipo de cliente/actividad no será sólo una etiqueta comercial. Funcionará como un perfil que configura capacidades, textos, navegación, campos y pantallas adicionales sobre el núcleo común.

La arquitectura tendrá dos capas:

1. **Core Turnos**: sedes, servicios, recursos, agendas, disponibilidad, clientes, reservas, calendario, permisos, notificaciones y builder.
2. **Perfil vertical**: módulos opcionales para un rubro o actividad, con sus propias entidades y pantallas, integrados mediante referencias explícitas a servicios, recursos, clientes y reservas.

El perfil nunca copiará el motor de disponibilidad ni cambiará el contrato de reservas. Una peluquería puede agregar fichas de servicios; un gimnasio puede agregar rutinas; una cancha puede agregar formato de torneo; un taller puede agregar vehículos y órdenes de trabajo.

Se recomienda distinguir `business_profile` (configuración principal del negocio) de `activity_capabilities` (capacidades activadas dentro del perfil). Así un gimnasio puede ofrecer turnos individuales, clases grupales y rutinas sin crear un addon diferente por cada combinación.

### Hotelería

No se incluye hotelería completa en Tags Turnos. Una reserva hotelera no es solamente un turno largo: necesita inventario por noche, tipos y unidades de alojamiento, ocupación por adultos/menores, planes tarifarios, temporadas, estadías, huéspedes, check-in/out, consumos y eventualmente sincronización con canales.

Decisión recomendada:

- Tags Turnos sí admite spa de día, excursiones, cabalgatas, amenities y alquileres por horas;
- una cabaña o habitación por noche queda fuera del MVP;
- un futuro Tags Hotel reutilizará clientes, identidad, notificaciones, pagos/señas, calendario y parte del cálculo de disponibilidad, pero tendrá su propio modelo de estadía e inventario.

No se agregará ahora una abstracción hotelera incompleta. Para no cerrar esa evolución, todas las reservas usarán `starts_at` y `ends_at`, zona horaria explícita y asignaciones de recursos independientes.

## 2. Contratos existentes verificados

### Infraestructura a reutilizar

| Capacidad | Contrato existente | Uso en Tags Turnos |
|---|---|---|
| Negocio | `tags_businesses` | Propietario del módulo y límite de datos |
| Addons | `tags_business_addons`, APIs `/api/business/addons/...` | Habilitación comercial y control de vigencia |
| Activación Workspace | `/api/workspace/apps/{app}/activate` | Crear módulo, QR, QR-Page y contenido inicial en transacción |
| Página pública | `tags_qr_pages`, `/p/[slug]` | Publicación y resolución pública por slug |
| QR | `createAppQRCode`, `registerQRAddonUsage` | QR principal y contabilización del addon |
| Portal | `tags_portals`, `tags_portal_routes`, `getPublicPortalContext` | Ruta hija, header/footer y navegación global |
| Temas | `tags_qr_page_themes`, `/api/qr-page/themes/list`, `/apply`, `/reset` | Herencia de tema Portal y override de página |
| Builder | secciones/bloques de Store y `StoreBlockEditor` | Editor declarativo y renderizado público |
| Autenticación | cookie firmada `tags_session`, magic links y `sendMail` | Dueño/plataforma y acceso de personal |
| Permisos | patrón de roles, permisos, overrides y auditoría de Resto | Contrato funcional a generalizar dentro del addon |
| Reviews | addon `client_reviews` y tokens de experiencia | Invitación posterior a una reserva cumplida |
| Archivos | `/api/files/...`, módulo `files` | Imágenes de servicios y recursos |
| Calendario | FullCalendar ya instalado | Agenda administrativa sin dependencias nuevas |
| Alertas | patrón `RestoOperationalAlerts` y preferencias en settings | Avisos operativos; reutilizar patrón, no acoplar código Resto |

### Límites de reutilización

- No se reutilizarán `tags_stores`, pedidos, productos ni sesiones de Resto como almacenamiento de Turnos.
- No se convertirán recursos de Turnos en productos de Store.
- `StoreBlockEditor` se reutilizará conservando sus props; Turnos tendrá definiciones y registro de bloques propios.
- El esquema de personal de Resto sirve como patrón, pero está acoplado a `store_id`, `tags_resto_*` y sesiones `resto_staff`. No debe consultarse directamente desde Turnos.
- Tags ID hoy representa páginas/perfiles QR; no se encontró un contrato transversal de “cliente Tags” que deba convertirse en requisito. La asociación con una identidad global será opcional y posterior.
- Las reseñas de experiencia (`client_reviews`) son las aplicables. Las Commerce Reviews de Store no se mezclarán con reservas.

## 3. Arquitectura

Se propone un módulo aislado por dominio y conectado a la infraestructura transversal:

```text
Workspace / Addon
        |
        +-- activa Tags Turnos + QR-Page + QR
        |
Página pública /p/[slug]
        |
        +-- renderer y builder Turnos
        +-- catálogo de servicios
        +-- búsqueda de disponibilidad
        +-- alta / confirmación / gestión de reserva
        |
API Turnos
        |
        +-- acceso, validación, disponibilidad y reservas
        +-- notificaciones, auditoría e integraciones
        |
MySQL
        |
        +-- módulo, sedes, servicios, recursos y agendas
        +-- clientes, reservas, asignaciones y eventos
```

Estructura prevista, sujeta a aprobación:

```text
app/modules/turnos/
  components/admin/
  components/public/
  components/builder/
  components/profiles/
  lib/access/
  lib/availability/
  lib/bookings/
  lib/notifications/
  lib/builder/
  lib/profiles/
  public/
  styles/

app/modules/turnos-profiles/
  gimnasio/
  peluqueria/
  taller/
  canchas/
  salud/

app/api/turnos/
  admin/
  public/

app/dashboard/businesses/[id]/turnos/
```

`turnos` será el nombre técnico recomendado del addon y de las rutas. La interfaz podrá mostrar “Tags Turnos” o “Reservas” según la terminología configurada, sin cambiar tablas ni endpoints.

Los perfiles pueden vivir inicialmente dentro del módulo Turnos para evitar addons prematuros. Sólo se separarán como addons propios cuando tengan ciclo comercial, permisos, facturación o infraestructura sustancialmente independiente.

## 4. Modelo funcional

### 4.0 Perfil de actividad

La instancia de Turnos tendrá un perfil configurable con código técnico, nombre visible, capacidades habilitadas, navegación, terminología, campos sugeridos y plantillas iniciales de servicios, recursos y builder. El administrador podrá activar o desactivar capacidades después de la instalación.

Capacidades iniciales posibles: `appointments`, `group_classes`, `resource_rental`, `customer_records`, `routines`, `memberships`, `vehicle_records`, `patient_intake`, `waitlist` y `packages`.

La activación debe ser idempotente, auditable y compatible con negocios que ya tienen reservas. El catálogo de capacidades no reemplaza permisos: una capacidad visible puede seguir restringida por rol.

### 4.0.1 Política de canales y creación

La reserva y la publicación de disponibilidad son decisiones independientes por instancia, sede y servicio:

- `admin_only`: sólo el comercio crea reservas desde el panel;
- `public_request`: el cliente puede solicitar un horario y queda `pending` para aprobación;
- `public_auto_confirm`: el cliente puede elegir un horario y confirmar automáticamente si cumple las políticas;
- `hybrid`: el comercio puede crear reservas y el cliente puede usar el canal público para los servicios habilitados.

El comercio podrá activar o desactivar el canal público sin perder reservas existentes. También podrá publicar sólo ciertos servicios, sedes, recursos, días o ventanas de anticipación.

“Público” no significa anónimo: la política del servicio define si alcanza con contacto validado, magic link/OTP, cuenta del cliente o una combinación. El sistema debe permitir que un negocio exija identificación antes de mostrar slots o antes de confirmar.

### 4.1 Módulo

Cada negocio tendrá una instancia de Tags Turnos con:

- QR-Page pública;
- zona horaria IANA, por defecto la del negocio y no la del navegador;
- moneda;
- estado de publicación;
- políticas generales;
- configuración visual y operativa;
- numeración legible de reservas.

### 4.2 Sedes

Una sede es un lugar físico o virtual donde se presta un servicio. Permite que una cadena, consultorio o profesional trabaje en más de una ubicación sin duplicar servicios.

Datos principales:

- nombre, dirección, contacto y ubicación;
- zona horaria opcional si difiere de la instancia;
- instrucciones de llegada;
- estado activo.

En el MVP una reserva pertenece a una sede. Los servicios virtuales pueden usar una sede marcada como virtual.

### 4.3 Servicios

El servicio define lo que se ofrece, no quién lo realiza.

Configuración:

- nombre, descripción, categoría e imágenes;
- duración base y duraciones opcionales;
- tiempo de preparación previo y recuperación posterior;
- modalidad individual, grupal o alquiler;
- capacidad de clientes;
- anticipación mínima y ventana máxima de reserva;
- cancelación y reprogramación;
- confirmación automática o aprobación manual;
- precio informativo y futura seña;
- datos requeridos al cliente;
- visibilidad y orden.

Ejemplos:

- “Corte de cabello”, 45 minutos;
- “Diagnóstico mecánico”, 60 minutos;
- “Alquiler cancha de pádel”, 90 minutos;
- “Clase de funcional”, cupo 15;
- “Cabalgata de dos horas”, cupo 8.

### 4.4 Recursos

Un recurso es una unidad reservable:

- persona: profesional, técnico, instructor o guía;
- espacio: cancha, consultorio, box, cabina o sala;
- equipo: máquina, elevador o vehículo;
- activo: caballo, bicicleta u otro recurso operativo;
- recurso virtual o genérico, cuando sólo interesa el cupo.

Propiedades:

- tipo configurable y etiqueta visible;
- capacidad;
- sede principal;
- color de calendario;
- datos públicos y privados;
- estado activo;
- posibilidad de selección por el cliente.

Un servicio podrá requerir una o varias clases de recurso. Ejemplo: un diagnóstico puede requerir un mecánico y un box; una sesión puede requerir un profesional y un consultorio. Los requerimientos indican cantidad y si el cliente puede elegir. Las asignaciones de la reserva guardan los recursos concretos elegidos por el motor o por el usuario.

### 4.5 Agenda

La disponibilidad efectiva no se guardará como miles de slots precalculados. Se calculará a partir de:

1. horario semanal del módulo, sede o recurso;
2. disponibilidad específica del servicio/recurso;
3. excepciones por fecha: feriado, licencia, mantenimiento, apertura extraordinaria;
4. buffers y duración;
5. reservas activas ya existentes;
6. capacidad y unidades ocupadas;
7. reglas de anticipación, horizonte y zona horaria.

Las reglas más específicas prevalecen sobre las generales. Una excepción cerrada prevalece sobre un horario regular. Una apertura extraordinaria puede habilitar un período normalmente cerrado.

### 4.6 Reservas

Estados propuestos:

- `draft`: intento incompleto, sólo si una integración futura necesita retención;
- `pending`: espera aprobación del negocio;
- `confirmed`: cupo confirmado;
- `checked_in`: cliente presente;
- `in_progress`: servicio iniciado;
- `completed`: servicio cumplido;
- `cancelled_by_customer`;
- `cancelled_by_business`;
- `rejected`;
- `no_show`;
- `expired`: confirmación o retención vencida.

Sólo `pending`, `confirmed`, `checked_in` e `in_progress` bloquean disponibilidad. `draft` sólo la bloqueará si existe una retención con vencimiento explícito.

Todo cambio de estado generará historial. La UI no inferirá estados distintos a los definidos por el dominio.

## 5. Tablas y relaciones propuestas

No se ejecutará ninguna migración hasta su aprobación. Los nombres y columnas se validarán nuevamente contra el esquema real antes de generar SQL.

### Núcleo

#### `tags_turnos_apps`

- `id`
- `business_id` único
- `page_id` único, referencia lógica a `tags_qr_pages`
- `slug`
- `name`
- `business_profile_code`
- `capabilities_json` (cache de lectura; la fuente de verdad debe ser una tabla de capacidades)
- `timezone`
- `currency`
- `status`
- `settings_json`
- `styles_json`
- `public_booking_policy_json`
- `deposit_policy_json`
- timestamps

Es la instancia del addon. Se evita usar `tags_stores` porque Turnos no es una tienda.

#### `tags_turnos_locations`

- `id`, `turnos_id`
- `name`, `description`
- `location_type` (`physical`, `virtual`, `mobile`)
- dirección y coordenadas opcionales
- contacto e instrucciones
- `timezone` opcional
- `is_active`, timestamps

#### `tags_turnos_resource_types`

- `id`, `turnos_id`
- `code`, `name`, `singular_label`, `plural_label`
- `is_active`, timestamps

Permite etiquetas propias como Profesional, Cancha, Box, Caballo o Vehículo sin alterar el núcleo.

#### `tags_turnos_resources`

- `id`, `turnos_id`, `resource_type_id`, `location_id`
- `name`, `description`
- `capacity`
- `color`, `image_url`
- `public_metadata_json`, `private_metadata_json`
- `is_customer_selectable`
- `is_active`, `sort_order`, timestamps

#### `tags_turnos_service_categories`

- `id`, `turnos_id`
- `name`, `description`
- `is_visible`, `sort_order`, timestamps

#### `tags_turnos_profiles`

Catálogo técnico de perfiles instalables: `id`, `code`, `name`, `description`, defaults de capacidades, estado y timestamps.

#### `tags_turnos_capabilities`

Catálogo de capacidades: `id`, `code`, `name`, `description`, `module_key`, estado y timestamps.

#### `tags_turnos_app_capabilities`

Capacidades activadas por instancia: `turnos_id`, `capability_id`, configuración acotada, fechas de activación/desactivación y timestamps.

#### `tags_turnos_services`

- `id`, `turnos_id`, `category_id`
- `name`, `description`, `image_url`
- `booking_mode` (`individual`, `group`, `rental`)
- `duration_minutes`
- `buffer_before_minutes`, `buffer_after_minutes`
- `capacity`
- `confirmation_mode` (`automatic`, `manual`)
- `booking_channel_mode` (`admin_only`, `public_request`, `public_auto_confirm`, `hybrid`)
- `public_availability_enabled`
- `customer_identification_mode` (`contact`, `magic_link`, `account_required`)
- `min_notice_minutes`, `max_advance_days`
- `cancellation_notice_minutes`, `reschedule_notice_minutes`
- `price`, `currency`
- `deposit_policy_override_json` nullable
- `is_price_visible`, `is_visible`, `is_active`, `sort_order`
- `settings_json`, timestamps

#### `tags_turnos_service_locations`

- `service_id`, `location_id`
- `is_active`

#### `tags_turnos_service_resource_requirements`

- `id`, `service_id`, `resource_type_id`
- `quantity_required`
- `units_per_booking`
- `selection_mode` (`automatic`, `customer_optional`, `customer_required`)
- `is_required`, timestamps

#### `tags_turnos_service_resources`

- `service_id`, `resource_id`
- overrides opcionales de duración, precio y capacidad
- `is_active`

Limita qué recursos concretos pueden prestar un servicio.

### Disponibilidad

#### `tags_turnos_schedule_rules`

- `id`, `turnos_id`
- propietario polimórfico controlado: `scope_type` (`app`, `location`, `resource`, `service_resource`) y `scope_id`
- `weekday`
- `start_time`, `end_time`
- `valid_from`, `valid_until`
- `slot_interval_minutes`
- `capacity_override`
- `is_active`, timestamps

Una jornada partida se representa con dos reglas, no con JSON.

#### `tags_turnos_schedule_exceptions`

- `id`, `turnos_id`
- `scope_type`, `scope_id`
- `exception_type` (`closed`, `open`, `capacity_override`)
- `starts_at`, `ends_at`
- `capacity_override`
- `reason`, timestamps

#### `tags_turnos_group_occurrences`

- `id`, `service_id`, `location_id`
- `starts_at`, `ends_at`
- `capacity`
- `status`
- `assigned_resource_summary_json` sólo como lectura auxiliar, no como fuente de verdad
- timestamps

Se usa para clases o salidas con horario y cupo compartido. Las reservas individuales se calculan desde reglas; las actividades grupales reservan sobre una ocurrencia.

### Clientes, reservas y trazabilidad

#### `tags_turnos_customers`

- `id`, `business_id`
- `name`, `email`, `phone`
- documento y fecha de nacimiento opcionales
- `notes`
- `tags_identity_id` nullable y reservado para una identidad transversal futura
- `marketing_consent_at`, `privacy_consent_at`
- timestamps

Índices normalizados por negocio y contacto. No se fusionarán clientes automáticamente sólo por nombre.

#### `tags_turnos_bookings`

- `id`, `turnos_id`, `location_id`, `service_id`, `customer_id`
- `occurrence_id` nullable
- `booking_number`
- `public_token_hash`
- `status`
- `starts_at`, `ends_at`
- `timezone`
- `party_size`
- `price_snapshot`, `currency`
- `payment_status` (`not_required`, `pending`, `paid`, `partially_paid`, `failed`, `expired`, `refunded`)
- `deposit_required`, `deposit_amount`, `deposit_due_at`
- `payment_policy_snapshot_json`
- `customer_notes`, `internal_notes`
- `source` (`public`, `admin`, `qr`, `portal`, `resto`, `store`)
- `created_by_type`, `created_by_id`
- timestamps de confirmación, cancelación, check-in, inicio y finalización
- timestamps generales

Nombre, contacto, duración, precio, políticas y zona horaria relevantes también deben conservarse como snapshot para que cambios posteriores no reescriban la historia.

#### `tags_turnos_booking_resources`

- `booking_id`, `requirement_id`, `resource_id`
- `units`
- `starts_at`, `ends_at`
- timestamps

Los tiempos incluyen buffers cuando corresponda. Esta tabla es la fuente de verdad para detectar conflictos.

#### `tags_turnos_booking_status_history`

- `id`, `booking_id`
- `from_status`, `to_status`
- actor, motivo y metadata
- `created_at`

#### `tags_turnos_booking_tokens`

- `id`, `booking_id`
- `purpose` (`manage`, `confirm`, `cancel`, `reschedule`, `review`)
- `token_hash`
- `expires_at`, `used_at`, `created_at`

Nunca se guardarán tokens públicos reutilizables en texto plano.

#### `tags_turnos_payment_intents`

Abstracción de intención de pago, independiente del proveedor:

- `id`, `turnos_id`, `booking_id`
- `purpose` (`deposit`, `balance`, `refund`)
- `amount`, `currency`
- `provider`, `provider_reference`
- `status` (`created`, `pending`, `approved`, `rejected`, `expired`, `refunded`)
- `expires_at`, metadata segura e idempotency key
- timestamps

La reserva conserva el estado resumido y esta tabla conserva los intentos/proveedores. No se acoplará el core directamente a Mercado Pago.

#### `tags_turnos_custom_fields`

- `id`, `turnos_id`, `service_id` nullable
- `field_key`, etiqueta, tipo, opciones JSON
- requerido, visible, orden y estado

#### `tags_turnos_booking_answers`

- `booking_id`, `field_id`
- valor textual/JSON y timestamps

Los campos configurables sirven para patente, obra social, restricciones, nivel o talle sin agregar columnas por rubro. No deben usarse para datos clínicos sensibles en el MVP.

### Extensión de gimnasio: rutinas

La capacidad `routines` será la primera extensión vertical de referencia. Se conectará al core por `turnos_id`, `customer_id`, `staff_id` y, opcionalmente, `booking_id`.

Tablas previstas:

- `tags_turnos_exercise_catalog`: ejercicios, grupo muscular, equipamiento, instrucciones, advertencias e imágenes;
- `tags_turnos_routine_templates`: plantillas, objetivo, nivel, duración y responsable;
- `tags_turnos_routine_template_items`: ejercicios ordenados con series, repeticiones, descanso, carga y notas;
- `tags_turnos_customer_routines`: rutina asignada a un cliente, entrenador, fechas, estado y objetivo;
- `tags_turnos_customer_routine_items`: ejercicios asignados, sustituciones y parámetros;
- `tags_turnos_routine_logs`: ejecución vinculable a una reserva, ejercicios realizados, series, repeticiones, carga, duración y notas.

El gimnasio podrá reservar una clase o sesión con entrenador y administrar su plan de trabajo. Las rutinas no serán productos Store ni estados alternativos de reserva.

Otras extensiones futuras pueden cubrir vehículos/órdenes de taller, membresías, participantes de cabalgatas, contexto de partidos y preferencias de peluquería. Cada una deberá justificar sus tablas, permisos, auditoría y política de privacidad.

### Personal, permisos y operación

#### `tags_turnos_permissions`

Catálogo de permisos del addon.

#### `tags_turnos_roles`

Rol por instancia de Turnos.

#### `tags_turnos_role_permissions`

Relación rol-permiso.

#### `tags_turnos_staff`

Personal con magic link, asociado a la instancia y opcionalmente a recursos que representa.

#### `tags_turnos_staff_resources`

Permite que una persona vea o administre solamente sus recursos/agendas.

#### `tags_turnos_staff_permission_overrides`

Overrides explícitos allow/deny.

#### `tags_turnos_staff_auth_tokens`

Magic links de un solo uso, hasheados y con vencimiento.

#### `tags_turnos_audit_log`

Acciones administrativas y operativas relevantes.

### Notificaciones

#### `tags_turnos_notification_jobs`

- reserva, canal, plantilla/evento;
- destinatario;
- fecha programada;
- estado, intentos, error y fecha de envío;
- clave de idempotencia.

Esta outbox evita depender de enviar emails dentro de la transacción de reserva. El procesamiento programado requiere definir el mecanismo de cron disponible en el despliegue antes de implementar recordatorios automáticos.

### Relaciones principales

```text
business
  └─ turnos_app
      ├─ locations
      ├─ resource_types ─ resources
      ├─ service_categories ─ services
      │                       ├─ locations
      │                       ├─ resource_requirements
      │                       ├─ eligible_resources
      │                       └─ group_occurrences
      ├─ schedule_rules / exceptions
      ├─ bookings ─ booking_resources
      │           ├─ status_history
      │           ├─ tokens
      │           └─ answers
      └─ staff ─ roles / permissions / resources
```

## 6. Motor de disponibilidad

### Entrada

- módulo y sede;
- servicio;
- rango de fechas;
- cantidad de personas;
- recursos elegidos opcionalmente;
- zona horaria del negocio.

### Proceso

1. Validar addon activo, módulo publicado, servicio visible y sede habilitada.
2. Resolver requisitos del servicio y recursos elegibles.
3. Construir ventanas desde reglas semanales.
4. Aplicar excepciones y aperturas extraordinarias.
5. Generar inicios según intervalo, duración y buffers.
6. Descartar inicios fuera de anticipación mínima o máxima.
7. Consultar asignaciones bloqueantes que se solapen.
8. Resolver una combinación válida de recursos para todos los requisitos.
9. Verificar capacidad o cupo de ocurrencia.
10. Devolver slots y opciones de recursos, sin exponer datos privados.

Condición estándar de solapamiento:

```text
existing.starts_at < requested.ends_at
AND existing.ends_at > requested.starts_at
```

### Concurrencia

La disponibilidad mostrada nunca garantiza por sí sola el cupo. Al crear o reprogramar:

- iniciar transacción;
- bloquear las filas de recursos/ocurrencia involucradas en orden determinista;
- volver a ejecutar la validación de conflicto dentro de la transacción;
- insertar reserva y asignaciones;
- confirmar;
- en conflicto devolver `409` con un error controlado y pedir otro horario.

No se usará solamente una comprobación previa desde el cliente.

## 7. APIs propuestas

Todas las mutaciones validarán método, sesión/token, addon, pertenencia al negocio, permisos, cuerpo y transición de estado. Los cuerpos vacíos o JSON malformados devolverán JSON controlado.

### Activación

- `POST /api/workspace/apps/turnos/activate`

Crea, en una transacción, QR, `tags_qr_pages` con `page_type = 'turnos'`, instancia, contenido inicial, uso del addon y publicación.

### Públicas

- `GET /api/turnos/public/app?slug=...`
- `GET /api/turnos/public/services?slug=...`
- `POST /api/turnos/public/customer/request-link`
- `POST /api/turnos/public/customer/verify-link`
- `GET /api/turnos/public/availability?...`
- `POST /api/turnos/public/bookings/create`
- `POST /api/turnos/public/bookings/[bookingId]/payment-intent`
- `GET /api/turnos/public/bookings/get?token=...`
- `POST /api/turnos/public/bookings/confirm`
- `POST /api/turnos/public/bookings/cancel`
- `POST /api/turnos/public/bookings/reschedule`

Crear reserva debe aceptar una clave de idempotencia. Las APIs públicas tendrán límites de tamaño y rate limiting siguiendo el patrón público de Store.

### Administración

- `GET|POST|PATCH /api/turnos/admin/settings`
- CRUD `/api/turnos/admin/locations`
- CRUD `/api/turnos/admin/resource-types`
- CRUD `/api/turnos/admin/resources`
- CRUD `/api/turnos/admin/service-categories`
- CRUD `/api/turnos/admin/services`
- CRUD `/api/turnos/admin/schedules`
- CRUD `/api/turnos/admin/exceptions`
- CRUD `/api/turnos/admin/occurrences`
- `GET /api/turnos/admin/calendar`
- `GET|POST /api/turnos/admin/bookings`
- `GET|PATCH /api/turnos/admin/bookings/[bookingId]`
- `POST /api/turnos/admin/bookings/[bookingId]/payment-intent`
- `POST /api/turnos/admin/bookings/[bookingId]/mark-deposit-paid`
- `POST /api/turnos/admin/bookings/[bookingId]/status`
- `POST /api/turnos/admin/bookings/[bookingId]/reschedule`
- `GET /api/turnos/admin/customers`
- endpoints de staff, roles y permisos
- endpoints de builder, manteniendo el patrón de Store/Resto

No se crearán endpoints separados por rubro.

### Respuesta de error

Contrato recomendado:

```json
{
  "ok": false,
  "error": "El horario ya no está disponible.",
  "code": "SLOT_CONFLICT",
  "details": {}
}
```

`details` sólo incluirá información segura y accionable.

## 8. Flujo público completo

1. Cliente abre `/p/[slug]` desde QR, Portal o enlace.
2. Ve presentación, categorías y servicios publicados externamente.
3. Si la política lo exige, se identifica con contacto validado, magic link/OTP o cuenta.
4. Elige servicio, sede y cantidad de personas.
5. Si corresponde, elige profesional/recurso o “cualquiera disponible”.
6. Consulta fechas y horarios calculados en zona horaria del negocio.
7. Completa contacto y campos requeridos.
8. Acepta políticas y privacidad.
9. El sistema muestra si la reserva requiere seña, monto, vencimiento y política de cancelación.
10. El servidor revalida el slot y crea:
   - `confirmed` si la aprobación es automática;
   - `pending` si requiere aprobación.
11. Si requiere seña, el sistema crea una intención de pago y mantiene una retención temporal del slot. La confirmación definitiva depende de la política configurada.
12. Se muestra número y enlace seguro de gestión.
13. Se encolan email de recepción/confirmación y recordatorios.
14. El cliente puede confirmar, cancelar o reprogramar según política.
15. El negocio realiza check-in, inicia y completa.
16. Si Tags Reviews está activo, una reserva completada puede generar un token de experiencia con retorno al detalle de la reserva.

El acceso público a una reserva se hará por token opaco, no por ID incremental ni sólo por email/teléfono.

El negocio puede crear la misma reserva desde el panel para un cliente identificado, con o sin seña. El origen queda registrado como `admin`, el actor queda auditado y se aplica la misma validación de disponibilidad y política de pago.

## 9. Panel público

### Páginas

- home de Turnos;
- catálogo/lista de servicios;
- detalle de servicio;
- selector de sede/recurso;
- calendario y slots;
- formulario de reserva;
- identificación del cliente cuando la política lo requiere;
- pantalla de seña/pago cuando corresponda;
- resultado pendiente/confirmado;
- gestión de reserva por token.

### Builder

Secciones iniciales:

- header propio;
- hero;
- categorías;
- servicios destacados;
- selector/reservador;
- profesionales o recursos visibles;
- información de sedes;
- preguntas frecuentes;
- reseñas de experiencia;
- CTA;
- footer propio.

El renderer respetará:

- tema Portal heredado salvo `global_styles.theme_override = true`;
- header/footer Portal;
- posibilidad de ocultar header/footer propios desde Portal;
- visibilidad individual de secciones y bloques;
- edición declarativa mediante el editor reutilizado.

Cuando una capacidad vertical esté activa, el builder podrá mostrar sus bloques y CTAs. Por ejemplo, un gimnasio podrá mostrar “Reservar clase”, “Ver mi rutina” y “Consultar membresía”. El renderer debe ocultar bloques de capacidades no habilitadas sin romper la página.

## 10. Panel administrativo

Rutas propuestas:

- `/dashboard/businesses/[id]/turnos`
- `/turnos/calendar`
- `/turnos/bookings`
- `/turnos/bookings/[bookingId]`
- `/turnos/services`
- `/turnos/resources`
- `/turnos/locations`
- `/turnos/customers`
- `/turnos/staff`
- `/turnos/reports`
- `/turnos/settings`
- `/turnos/builder`

Rutas condicionales por capacidades:

- `/turnos/routines` y `/turnos/routines/[id]` si `routines` está activa;
- `/turnos/memberships` si `memberships` está activa;
- `/turnos/vehicles` y `/turnos/work-orders` si el perfil taller las habilita;
- `/turnos/classes` si `group_classes` está activa.

La navegación debe derivarse del catálogo de capacidades y permisos, no de una lista fija por rubro.

### Inicio

- turnos de hoy;
- pendientes de aprobación;
- próximos check-ins;
- cancelaciones y no-show;
- ocupación/cupos;
- accesos rápidos.

### Calendario

FullCalendar con:

- vistas día, semana y mes;
- filtros por sede, servicio y recurso;
- color por recurso/estado;
- creación manual;
- detalle rápido;
- bloqueo de agenda;
- reprogramación por interacción sólo cuando se implemente validación server-side y confirmación explícita.

### Reservas

- listado y búsqueda;
- filtros por período, estado, sede, servicio y recurso;
- aprobación/rechazo;
- reprogramación;
- check-in, inicio, finalización y no-show;
- historial y auditoría;
- contacto práctico por teléfono/email/WhatsApp.

### Configuración

- identidad y publicación;
- canales de reserva por servicio y sede;
- identificación requerida para clientes externos;
- política de señas, retenciones, vencimientos y devoluciones;
- zona horaria y moneda;
- reglas generales;
- políticas;
- textos y terminología;
- notificaciones;
- privacidad;
- temas y builder;
- futuras integraciones.

## 11. Permisos

Permisos iniciales:

- `dashboard.view`
- `calendar.view`
- `calendar.manage`
- `bookings.view`
- `bookings.create`
- `bookings.approve`
- `bookings.reschedule`
- `bookings.cancel`
- `bookings.checkin`
- `bookings.complete`
- `customers.view`
- `customers.manage`
- `services.view`
- `services.manage`
- `resources.view`
- `resources.manage`
- `availability.view`
- `availability.manage`
- `reports.view`
- `settings.view`
- `settings.manage`
- `publish.manage`
- `builder.manage`
- `staff.view`
- `staff.manage`
- `audit.view`

Permisos de capacidades se agregan sólo cuando la capacidad existe. Para gimnasio, por ejemplo: `routines.view`, `routines.manage`, `routines.assign`, `routines.log`, `exercise_catalog.manage`, `memberships.view` y `memberships.manage`.

El dueño conserva acceso total; un entrenador puede administrar rutinas de sus clientes o recursos asignados; recepción puede gestionar reservas sin acceder a notas privadas de entrenamiento.

Roles sugeridos como semillas editables:

- Administrador;
- Encargado;
- Recepción;
- Profesional/Recurso;
- Sólo lectura.

El dueño del negocio y administrador de plataforma conservan acceso total. El personal puede limitarse a recursos concretos mediante `tags_turnos_staff_resources`.

## 12. Integraciones

### Addon y Workspace

- catálogo/comercialización con código técnico `turnos`;
- activación sólo con addon activo y vigente;
- una instancia por negocio en el MVP;
- consumo de QR registrado con la infraestructura actual;
- desactivación comercial impide nuevas reservas sin borrar historial.

### Portal

- Turnos puede ser ruta hija y home del Portal;
- hereda tema, identidad, navegación, header y footer;
- respeta overrides;
- el CTA del Portal puede enlazar directamente al reservador o a un servicio.

### QR y QR-Page

- página `page_type = 'turnos'`;
- slug único y bloqueado después de activar, siguiendo el patrón actual;
- QR principal creado por `createAppQRCode`;
- en una etapa posterior podrán existir QR profundos para sede, servicio o recurso sin crear otra instancia.

### Tags Resto

No se reemplazan `tags_resto_sessions` ni las mesas operativas.

Integraciones futuras:

- reservar una mesa antes de abrir una sesión Resto;
- convertir llegada/check-in en preapertura controlada;
- reservar eventos o experiencias gastronómicas con cupo;
- enlazar pedido o consumo desde una reserva.

La integración debe guardar referencias explícitas, nunca asumir que `booking_id` y `session_id` son intercambiables.

### Tags Store

No se reutilizan órdenes ni productos como servicios. Integraciones futuras:

- vender una seña, bono o gift card;
- adjuntar productos a una reserva;
- usar Mercado Pago mediante una capa de pagos transversal;
- enlazar una orden y una reserva con tabla de relación o referencia externa.

Store no será modificado para el MVP.

### Tags Reviews

Cuando `client_reviews` esté activo:

- sólo reservas `completed` son elegibles;
- se genera token de review de un solo uso o con política definida;
- el formulario sigue siendo el de Tags Reviews;
- `returnTo` vuelve a la reserva;
- no se usan Commerce Reviews.

### Tags ID

Integración posible:

- enlazar un recurso-profesional con su página Tags ID;
- mostrar perfil profesional público;
- precompletar identidad del cliente cuando exista en el futuro una cuenta transversal consentida.

No se hará depender una reserva pública de tener Tags ID.

### Notificaciones y email

Eventos:

- reserva recibida;
- aprobada/rechazada;
- confirmación solicitada;
- recordatorio;
- reprogramada;
- cancelada;
- próxima a comenzar;
- no-show/completada;
- invitación a review.

MVP: email y alertas internas. WhatsApp queda como integración futura y debe respetar consentimiento, plantillas y proveedor real.

### Calendarios externos

Diseño futuro:

- tabla de conexiones por negocio/recurso;
- identificadores externos por reserva;
- outbox de sincronización;
- webhooks y cursores de proveedor;
- reconciliación e idempotencia.

Google, Outlook y Apple/iCal no se implementan en el núcleo inicial, pero los IDs externos no se guardarán dentro de JSON de la reserva.

### Pagos y señas

La seña será una política configurable por instancia, sede o servicio, aplicable tanto a reservas creadas por el comercio como a reservas públicas. Opciones:

- no requerida;
- monto fijo;
- porcentaje del precio;
- precio completo por adelantado;
- requerida sólo en determinados horarios, servicios o canales.

La política se copia como snapshot en la reserva. Cambiar la configuración no modifica reservas ya creadas.

Se diseñará una interfaz transversal de pagos antes de acoplar Mercado Pago:

- intención;
- monto;
- proveedor;
- estado;
- expiración;
- devolución;
- referencia a reserva.

Reglas propuestas:

- la reserva de panel puede quedar confirmada con seña pendiente si el comercio lo permite;
- la reserva pública con seña obligatoria retiene recursos hasta `deposit_due_at`;
- si el pago no llega antes del vencimiento, la reserva pasa a `expired` o `cancelled_by_business` según política y libera recursos;
- una aprobación manual puede ocurrir antes o después del pago, según configuración;
- un pago aprobado debe ser idempotente frente a reintentos/webhooks;
- cancelación y devolución respetan la política snapshot, no la configuración vigente;
- la seña no implica automáticamente pago total ni cierre de la reserva.

El MVP puede comenzar con reservas sin cobro, pero debe conservar estos campos y transiciones para no romper el modelo cuando se active la primera pasarela.

## 13. Seguridad, privacidad y consistencia

- Todos los queries administrativos se limitan por `business_id`/`turnos_id`.
- Los tokens se generan con entropía criptográfica, se almacenan hasheados y vencen.
- Nunca se expone metadata privada de recursos ni notas internas.
- Rate limiting en disponibilidad, creación y gestión pública.
- Idempotencia en creación, notificaciones e integraciones.
- Idempotencia específica para intenciones de pago, confirmaciones y webhooks.
- No confirmar una reserva pública con seña obligatoria hasta cumplir la política configurada.
- Validación server-side de fechas, zona horaria, transiciones y pertenencia.
- Transacciones y revalidación para evitar doble reserva.
- Auditoría de cambios sensibles.
- Retención y anonimización de clientes a definir antes de producción.
- Campos configurables no habilitan historias clínicas ni información médica sensible en el MVP.
- Fechas persistidas como instantes UTC; reglas horarias interpretadas en zona IANA de la sede/módulo.
- No enviar notificaciones antes de confirmar la transacción.

## 14. Roadmap

### Etapa 0 — aprobación y contratos

- aprobar alcance y terminología;
- confirmar código de addon y límites de plan;
- validar esquema real de tablas transversales;
- entregar migración SQL exacta, sin ejecutarla;
- definir contratos de estado y permisos.

### Etapa 1 — núcleo administrativo

- activación del addon;
- instancia, sedes, tipos de recurso, recursos y servicios;
- agendas semanales y excepciones;
- permisos básicos;
- pruebas unitarias del motor de disponibilidad.

### Etapa 2 — reserva pública MVP

- QR-Page y renderer;
- servicios, disponibilidad y alta;
- confirmación automática/manual;
- gestión segura por token;
- email básico;
- prevención transaccional de doble reserva.

### Etapa 3 — operación

- calendario FullCalendar;
- filtros y detalle;
- reservas manuales;
- aprobación, reprogramación, cancelación, check-in y finalización;
- clientes, auditoría y alertas internas;
- clases/ocurrencias con cupos.

### Etapa 3A — perfiles y primera vertical

- selector de perfil durante activación/configuración;
- catálogo de capacidades y navegación condicional;
- perfiles gimnasio, peluquería/estética, taller, canchas, salud/bienestar, actividades/excursiones y genérico;
- `group_classes` y `customer_records`;
- extensión `routines` para gimnasio: catálogo de ejercicios, plantillas, asignación y registro básico;
- permisos y auditoría de la extensión;
- pruebas que confirmen que desactivar una capacidad no altera reservas existentes.

### Etapa 4 — builder, Portal y Reviews

- secciones/bloques Turnos;
- editor declarativo reutilizado;
- temas heredados y override;
- rutas Portal;
- invitación a Tags Reviews.

### Etapa 5 — automatización

- outbox y recordatorios programados;
- reportes;
- listas de espera;
- reservas recurrentes;
- paquetes/bonos;
- QR profundos.

### Etapa 6 — pagos e integraciones

- señas y pagos;
- WhatsApp;
- Google Calendar y Outlook;
- exportación iCal/Apple Calendar;
- webhooks e API de integración.

### Producto separado — Tags Hotel

- tipos y unidades de alojamiento;
- inventario por noche;
- ocupación y huéspedes;
- temporadas y planes tarifarios;
- estadías, check-in/out;
- consumos y housekeeping;
- canales externos.

Tags Hotel deberá compartir servicios transversales, no tablas operativas de Turnos.

## 15. Criterios de aceptación del MVP

- Un negocio con addon activo puede publicar una página Turnos.
- Puede configurar al menos una sede, servicio, tipo de recurso, recurso y agenda.
- Puede representar profesional, cancha, box o equipo sin cambiar código.
- El público ve sólo slots realmente disponibles.
- Dos solicitudes concurrentes no pueden confirmar el mismo recurso/capacidad.
- Una reserva puede aprobarse, confirmarse, reprogramarse, cancelarse y completarse con historial.
- El cliente gestiona su reserva mediante token seguro.
- Dueño y personal ven sólo lo permitido.
- Portal y tema override funcionan con el contrato existente.
- Tags Store y Tags Resto no cambian ni se degradan.
- No se requiere ninguna librería nueva.
- La selección de perfil sólo habilita configuración y capacidades compatibles; no crea forks del motor.
- Un gimnasio puede reservar una clase/sesión y, si activa `routines`, asignar una rutina sin modificar la reserva base.
- Una cuenta sin `routines` no ve sus tablas, rutas, bloques ni permisos.
- El comercio puede operar en modo sólo panel, público solicitado o público auto-confirmado por servicio.
- Una seña configurable se aplica consistentemente a reservas del panel y reservas públicas, con vencimiento e historial.

## 16. Decisiones pendientes antes de escribir código

1. Confirmar nombre comercial “Tags Turnos” y código técnico `turnos`.
2. Confirmar una instancia por negocio en el MVP.
3. Definir si clases grupales/ocurrencias entran en el primer MVP o en la etapa operativa.
4. Definir si la reserva pública requiere email, teléfono o al menos uno de ambos.
5. Definir duración mínima/máxima y horizonte máximo aceptado.
6. Confirmar que pagos/señas y WhatsApp quedan fuera del primer MVP.
7. Confirmar que hotelería por noche será Tags Hotel.
8. Definir mecanismo real de tareas programadas antes de prometer recordatorios automáticos.
9. Confirmar perfiles iniciales visibles en el onboarding y si `routines` entra en la primera versión operativa.
10. Definir qué datos de rutinas son privados para entrenador/cliente y cuáles puede consultar recepción.
11. Confirmar modos de identificación pública: contacto validado, magic link/OTP o cuenta requerida.
12. Confirmar si una reserva creada por el comercio puede quedar confirmada con seña pendiente o debe cobrarse antes.
