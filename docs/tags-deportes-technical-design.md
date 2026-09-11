# Tags Deportes — Diseño técnico funcional

## 1. Objetivo

Tags Deportes será el producto de gestión integral para clubes, complejos deportivos, academias y establecimientos que administren tenis, pádel, fútbol u otras disciplinas.

El producto utilizará Tags Turnos como motor de disponibilidad y reservas. No duplicará calendarios, recursos, clientes, pagos, Store, Resto, autenticación, Directorios, Portal ni notificaciones.

Nombre comercial inicial:

- **Tags Deportes**
- Descriptor: **Gestión integral para clubes y complejos deportivos**
- Código interno propuesto: `sports_club`

## 2. Principios

1. `tags_businesses` continúa siendo la única fuente de verdad de los datos comunes del club.
2. `tags_users` continúa siendo la identidad personal única del usuario.
3. `tags_turnos_*` continúa siendo la fuente de verdad de agenda, disponibilidad y reservas.
4. Las tablas `tags_sports_*` contendrán solamente información propia del dominio deportivo.
5. Tags Store administrará la tienda deportiva.
6. Tags Resto administrará la cantina y sus pedidos.
7. Tags Fidelización administrará puntos, sellos, visitas y recompensas comerciales.
8. El ranking deportivo no se mezclará con fidelización ni con estadísticas de QR.
9. Un visitante podrá reservar sin pertenecer a la comunidad si el administrador lo permite.
10. Todo acceso público conservará el dominio, identidad y navegación del canal de origen.

## 3. Resolución de canal y branding

La experiencia pública se resolverá en este orden:

1. Dominio propio del club.
2. Directorio desde el que ingresó el usuario.
3. Portal público del negocio.
4. Dominio general de Tags como respaldo.

Si el club pertenece a CalamuchitAr:

- registro, ingreso y cuenta personal se servirán desde `calamuchita.ar`;
- los magic links regresarán a `calamuchita.ar`;
- páginas, reservas, comunidad, torneos y rankings utilizarán su branding;
- las cookies y retornos respetarán el contexto público existente;
- Tags actuará como motor y no como marca pública principal.

Una persona tendrá una sola cuenta en `tags_users`, aunque participe en varios clubes o Directorios.

## 4. Arquitectura

```text
Tags Deportes
├── Identidad del negocio ........ tags_businesses
├── Identidad personal ........... tags_users
├── Reservas y disponibilidad .... tags_turnos_*
├── Comunidad deportiva .......... tags_sports_members*
├── Disciplinas y categorías ..... tags_sports_disciplines*
├── Equipos y parejas ............ tags_sports_teams*
├── Torneos y partidos ........... tags_sports_tournaments*
├── Rankings deportivos .......... tags_sports_rankings*
├── Comunicaciones ............... motor común + entregas deportivas
├── Cantina ...................... Tags Resto
├── Tienda ....................... Tags Store
├── Beneficios ................... Tags Fidelización
└── Página pública ............... QR-Page / Portal / Directorio
```

## 5. Reutilización de Tags Turnos

### Elementos reutilizados sin duplicación

- `tags_turnos_apps`: instancia operativa.
- `tags_turnos_locations`: sedes.
- `tags_turnos_resource_types`: tipos como cancha, campo, profesor o equipo.
- `tags_turnos_resources`: canchas, espacios, profesores y equipamiento.
- `tags_turnos_services`: alquileres, clases, entrenamientos y actividades.
- `tags_turnos_service_resources`: recursos habilitados por servicio.
- `tags_turnos_schedule_rules`: disponibilidad semanal.
- `tags_turnos_schedule_exceptions`: cierres, mantenimiento y bloqueos.
- `tags_turnos_bookings`: reservas.
- `tags_turnos_booking_resources`: ocupación real y control de superposición.
- `tags_turnos_booking_status_history`: trazabilidad.
- `tags_turnos_customers`: contacto operativo del reservante.
- `tags_turnos_payment_intents`: intención de seña o pago.
- roles, permisos, personal y auditoría de Turnos.
- publicación mediante `tags_qr_pages`.

### Ajustes sobre Turnos

- agregar la plantilla visible `sports_club`;
- recursos iniciales: cancha, campo, profesor y equipo;
- capacidades: `resource_rental`, `group_classes`, `customer_records`, `memberships`, `waitlist` y `packages`;
- terminología deportiva en formularios y página pública;
- políticas de reserva según miembro, visitante y administración;
- precios diferenciados sin reemplazar `price` de `tags_turnos_services`.

## 6. Modelo deportivo

### `tags_sports_apps`

Extensión uno a uno de una instancia de Turnos.

- `id`
- `business_id`
- `turnos_id` único
- `name`
- `status`
- `default_discipline_id`
- `community_enabled`
- `public_community_enabled`
- `settings_json`
- fechas de creación y actualización

### `tags_sports_disciplines`

- `id`, `sports_app_id`
- `code`, `name`, `description`
- `team_mode`: individual, doubles, team
- `scoring_mode`
- `is_active`, `sort_order`

Valores iniciales sugeridos: tenis, pádel y fútbol. El administrador podrá crear otras disciplinas.

### `tags_sports_resource_disciplines`

Relaciona canchas, campos, profesores u otros recursos de Turnos con una o varias disciplinas.

- `sports_app_id`
- `discipline_id`
- `resource_id`
- clave única por relación

### `tags_sports_service_rates`

Precios y condiciones por audiencia sin duplicar el servicio de Turnos.

- `sports_app_id`, `service_id`
- `audience_type`: guest, member, team, custom
- `price`, `currency`
- `deposit_policy_json`
- `valid_from`, `valid_until`
- `is_active`

### `tags_sports_members`

Relación entre una cuenta personal y un club.

- `id`, `sports_app_id`, `user_id`
- `turnos_customer_id` opcional
- `member_number`
- `status`: pending, active, suspended, inactive
- `joined_at`, `expires_at`
- `public_profile_enabled`
- `booking_enabled`
- `notes` privadas
- fechas

No repetirá nombre, email, documento, teléfono ni imagen de perfil de `tags_users`.

### `tags_sports_member_disciplines`

- `member_id`, `discipline_id`
- `category_id` opcional
- `level_code`
- `position_code`
- `dominant_side`
- `looking_for_players`
- `metadata_json`

### Categorías, equipos y parejas

- `tags_sports_categories`
- `tags_sports_teams`
- `tags_sports_team_members`

Permitirán categorías por edad, nivel o género, parejas de pádel/tenis y equipos de fútbol u otros deportes.

### Torneos

- `tags_sports_tournaments`
- `tags_sports_tournament_categories`
- `tags_sports_tournament_entries`
- `tags_sports_tournament_stages`
- `tags_sports_matches`
- `tags_sports_match_participants`
- `tags_sports_match_results`

El torneo podrá ser individual, parejas o equipos; usar zonas, eliminación directa o formato combinado.

### Rankings

- `tags_sports_ranking_seasons`
- `tags_sports_ranking_rules`
- `tags_sports_ranking_entries`
- `tags_sports_ranking_movements`

Los movimientos conservarán el motivo y la referencia al partido o ajuste administrativo.

### Comunicaciones

- `tags_sports_announcements`
- `tags_sports_announcement_recipients`
- `tags_sports_notification_deliveries`

Los destinatarios podrán filtrarse por disciplina, categoría, equipo, estado de socio o participantes de una reserva/torneo.

## 7. Políticas de reserva deportiva

Cada servicio podrá definir:

- `admin_only`: solamente el club crea reservas;
- `public_request`: el visitante solicita y el club confirma;
- `public_auto_confirm`: reserva pública automática;
- `members_only`: solamente miembros activos;
- `members_and_guests`: miembros y visitantes;
- anticipación mínima y máxima;
- cancelación y reprogramación;
- cantidad máxima de reservas activas por usuario;
- turnos consecutivos;
- seña o pago requerido;
- tarifa de miembro y tarifa de visitante;
- invitación de otros jugadores;
- liberación automática de una reserva impaga.

La validación final se hará siempre en servidor y dentro de una transacción. La interfaz no será fuente de verdad para disponibilidad ni precios.

## 8. Flujo público de reserva

1. Resolver dominio, Directorio, Portal y branding.
2. Mostrar solamente servicios publicados.
3. Elegir disciplina.
4. Elegir servicio: cancha, clase, entrenamiento o actividad.
5. Elegir recurso cuando sea seleccionable.
6. Consultar disponibilidad real.
7. Identificar al usuario según la política:
   - contacto simple;
   - cuenta personal/magic link;
   - miembro activo obligatorio.
8. Resolver precio y seña según audiencia.
9. Crear la reserva y asignar recursos en una transacción.
10. Registrar historial.
11. Enviar notificaciones idempotentes.
12. Devolver al usuario al dominio y contexto de origen.

## 9. Administración privada

La aplicación deportiva tendrá navegación propia, conservando el encabezado y la barra común de herramientas del negocio.

Solapas previstas:

1. Resumen.
2. Agenda y reservas.
3. Canchas y espacios.
4. Servicios y tarifas.
5. Comunidad.
6. Torneos.
7. Rankings.
8. Comunicaciones.
9. Cantina.
10. Tienda.
11. Personal y permisos.
12. Configuración.
13. Página pública.

Las solapas Cantina y Tienda aparecerán solamente si el negocio tiene los addons correspondientes activos.

## 10. Experiencia del miembro

Desde la cuenta personal contextual del Directorio podrá consultar:

- clubes y comunidades a las que pertenece;
- perfil deportivo;
- reservas próximas e historial;
- cancelación y reprogramación;
- disciplinas, categorías y nivel;
- equipos o parejas;
- torneos e inscripciones;
- partidos y resultados;
- ranking;
- convocatorias;
- avisos y notificaciones;
- beneficios;
- accesos a cantina y tienda cuando corresponda.

## 11. Página pública

La página pública podrá habilitar y ordenar:

- presentación;
- instalaciones;
- disciplinas;
- reserva de canchas;
- clases y profesores;
- comunidad;
- convocatorias abiertas;
- torneos;
- fixture y resultados;
- rankings;
- cantina;
- tienda;
- beneficios;
- contacto y ubicación.

Cada bloque será visible solamente si está habilitado y tiene datos. El administrador decidirá si la reserva pública está disponible.

## 12. APIs propuestas

### Administración

- `/api/sports/admin/settings`
- `/api/sports/admin/disciplines`
- `/api/sports/admin/resources`
- `/api/sports/admin/rates`
- `/api/sports/admin/members`
- `/api/sports/admin/categories`
- `/api/sports/admin/teams`
- `/api/sports/admin/tournaments`
- `/api/sports/admin/matches`
- `/api/sports/admin/rankings`
- `/api/sports/admin/announcements`

Las reservas seguirán utilizando `/api/turnos/admin/...`.

### Público y cuenta personal

- `/api/sports/public/app`
- `/api/sports/public/disciplines`
- `/api/sports/public/community`
- `/api/sports/public/tournaments`
- `/api/sports/public/rankings`
- `/api/sports/member/profile`
- `/api/sports/member/memberships`
- `/api/sports/member/teams`
- `/api/sports/member/tournaments`
- `/api/sports/member/notifications`

Disponibilidad y creación de reservas seguirán utilizando `/api/turnos/public/...`, ampliando su política de audiencia sin duplicar endpoints.

## 13. Permisos

Permisos deportivos adicionales:

- `sports.dashboard.view`
- `sports.disciplines.view/manage`
- `sports.members.view/manage`
- `sports.teams.view/manage`
- `sports.tournaments.view/manage`
- `sports.matches.view/manage`
- `sports.rankings.view/manage`
- `sports.communications.view/manage`

El dueño y el administrador de plataforma tendrán acceso total. El personal tendrá roles y permisos acotados. Los permisos de reservas continuarán bajo Turnos.

## 14. Integraciones

### Tags Resto

- acceso contextual a la cantina;
- pedidos desde página pública o cuenta del miembro;
- no copiar productos, mesas, pedidos, cocina ni caja.

### Tags Store

- indumentaria, accesorios, merchandising y productos deportivos;
- no copiar catálogo, carrito, pagos, envíos ni pedidos.

### Fidelización

- puntos, sellos, visitas y recompensas comerciales;
- no utilizar esos saldos como ranking deportivo.

### Directorio y Portal

- el club puede tener presencia en uno o varios Directorios;
- el canal de entrada define branding y URL de retorno;
- Portal puede agrupar Deportes, Resto, Store y otros productos;
- el administrador controla indexación y publicación con el sistema SEO existente.

## 15. Componentes iniciales

### Administración

- `SportsAdminPage`
- `SportsAdminTabs`
- `SportsOverview`
- `SportsDisciplinesManager`
- `SportsResourcesManager`
- `SportsRatesManager`
- `SportsCommunityManager`
- `SportsPublicationSettings`

Los calendarios y formularios de reserva reutilizarán componentes de Turnos mediante props y configuración, sin copiarlos.

### Público

- `SportsPublicRenderer`
- `SportsDisciplineSelector`
- `SportsBookingEntry`
- `SportsCommunityPreview`
- `SportsTournamentPreview`
- `SportsRankingPreview`

## 16. Roadmap

### Etapa 1 — Base deportiva y reservas

- perfil `sports_club`;
- activación sobre Tags Turnos;
- disciplinas;
- canchas y espacios;
- tarifas para miembros y visitantes;
- políticas de acceso a reservas;
- administración deportiva inicial;
- página pública inicial y branding contextual.

### Etapa 2 — Comunidad

- miembros vinculados a `tags_users`;
- perfiles deportivos;
- categorías, niveles, equipos y parejas;
- adhesión y administración;
- área privada del miembro;
- convocatorias.

### Etapa 3 — Torneos y rankings

- inscripción;
- fixture, zonas y llaves;
- partidos y resultados;
- tablas y rankings;
- publicación selectiva.

### Etapa 4 — Ecosistema comercial

- acceso integrado a Cantina/Resto;
- Store deportiva;
- beneficios y fidelización;
- comunicaciones segmentadas;
- métricas consolidadas.

## 17. Criterios de aceptación de la Etapa 1

1. Un negocio con Tags Turnos activo puede crear una instancia Tags Deportes.
2. La instancia conserva todos los turnos existentes y no afecta otras plantillas.
3. El administrador configura disciplinas, canchas, horarios y servicios.
4. Puede decidir si reserva administración, público, miembros o ambos.
5. Puede configurar precio de miembro y visitante.
6. La disponibilidad evita reservas superpuestas.
7. La página pública utiliza el branding del dominio o Directorio de origen.
8. Registro, login, magic links y retornos conservan ese dominio.
9. Un visitante puede reservar cuando está autorizado.
10. Los cambios no modifican el comportamiento de Store, Resto ni otros perfiles de Turnos.

