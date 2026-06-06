# Documentación — Módulo de Invitados

# Descripción General

El módulo de invitados es el núcleo operativo del sistema de gestión de eventos.

Se encarga de administrar:

- invitados
- RSVP
- confirmaciones
- acompañantes
- mesas
- tags
- restricciones alimentarias
- QR
- check-in
- tracking de invitaciones

---

# Arquitectura General

```txt
Event
 ├── Attendees
 │    ├── Companions
 │    ├── Tags
 │    ├── Tables
 │    └── Check-In
 │
 └── Invitations
      ├── Sending
      ├── Tracking
      └── RSVP
```

---

# Concepto Importante

## Invitado ≠ Invitación

Un invitado representa:

- una persona invitada al evento

Una invitación representa:

- el envío
- la experiencia visual
- el tracking
- el flujo RSVP

Por esta razón el sistema separa:

- attendee_status
- invitation_status

---

# Tabla Principal

# tags_event_attendees

Representa los invitados principales del evento.

Cada registro representa:

- una persona invitada
- con identidad
- QR
- RSVP
- tracking
- acceso al evento

---

# Estructura

| Campo | Función |
|---|---|
| id | ID del invitado |
| event_id | Evento relacionado |
| qr_code_id | Relación interna del QR |
| qr_token | Token único de acceso |
| name | Nombre del invitado |
| email | Email |
| phone | Teléfono |
| status | Estado operativo del invitado |
| invitation_status | Estado de la invitación |
| checked_in_at | Fecha de ingreso |
| viewed_at | Fecha de visualización |
| confirmed_at | Fecha de confirmación |
| declined_at | Fecha de rechazo |
| invite_sent_at | Fecha de envío |
| invite_opened_at | Fecha de apertura |
| plus_ones_allowed | Cantidad permitida de acompañantes |
| plus_ones_confirmed | Cantidad confirmada |
| dietary_notes | Restricciones alimentarias |
| internal_notes | Notas internas |
| created_at | Fecha de creación |

---

# attendee_status

Representa el estado operativo real del invitado.

## Estados posibles

| Estado | Descripción |
|---|---|
| pending | Pendiente de respuesta |
| confirmed | Asistencia confirmada |
| declined | Invitación rechazada |
| checked_in | Ya ingresó al evento |
| cancelled | Cancelado manualmente |

---

# invitation_status

Representa el estado de envío de la invitación.

## Estados posibles

| Estado | Descripción |
|---|---|
| not_sent | Invitación no enviada |
| sent | Invitación enviada |
| opened | Invitación abierta |
| failed | Error de entrega |

---

# Flujo RSVP

```txt
Invitación Enviada
        ↓
Invitación Abierta
        ↓
Invitado Confirma
        ↓
QR Activado
        ↓
Check-In
```

---

# Tabla de Acompañantes

# tags_event_attendee_companions

Representa acompañantes asociados a un invitado principal.

---

# ¿Por qué existe?

Porque un acompañante:

- puede tener QR
- puede hacer check-in
- puede tener restricciones alimentarias
- puede ocupar asiento
- puede confirmarse individualmente

---

# Relación

```txt
Attendee
 └── Companions[]
```

---

# Estructura

| Campo | Función |
|---|---|
| id | ID del acompañante |
| attendee_id | Invitado principal |
| name | Nombre |
| email | Email |
| phone | Teléfono |
| attendee_status | Estado RSVP |
| checked_in_at | Fecha de ingreso |
| dietary_notes | Restricciones alimentarias |
| created_at | Fecha de creación |

---

# Tabla de Tags

# tags_event_attendee_tags

Permite categorizar invitados.

---

# Casos de uso

```txt
VIP
Prensa
Backstage
Familia
Staff
Sponsors
Proveedor
Mesa Principal
```

---

# Ventajas

Permite:

- filtros
- segmentación
- campañas
- seating
- accesos especiales

---

# Estructura

| Campo | Función |
|---|---|
| id | ID del tag |
| event_id | Evento |
| name | Nombre del tag |
| color | Color visual |
| created_at | Fecha de creación |

---

# Tabla Relacional de Tags

# tags_event_attendee_tag_relations

Relaciona invitados con tags.

---

# Relación

```txt
Attendee
 ├── VIP
 ├── Press
 └── Family
```

---

# Estructura

| Campo | Función |
|---|---|
| attendee_id | Invitado |
| tag_id | Tag |

---

# Tablas / Seating

# tags_event_tables

Representa mesas físicas del evento.

---

# Casos de uso

- casamientos
- cenas
- corporate
- galas
- eventos VIP

---

# Estructura

| Campo | Función |
|---|---|
| id | ID de la mesa |
| event_id | Evento |
| name | Nombre de la mesa |
| capacity | Capacidad |
| created_at | Fecha de creación |

---

# Relación Invitado / Mesa

# tags_event_attendee_tables

Asigna invitados a mesas.

---

# Relación

```txt
Mesa 1
 ├── Juan
 ├── María
 └── Pedro
```

---

# Estructura

| Campo | Función |
|---|---|
| attendee_id | Invitado |
| table_id | Mesa |
| seats_reserved | Asientos reservados |

---

# Plus Ones

El sistema soporta acompañantes permitidos.

---

# Campos

| Campo | Función |
|---|---|
| plus_ones_allowed | Máximo permitido |
| plus_ones_confirmed | Cantidad confirmada |

---

# Ejemplo

```txt
Invitado:
Juan Pérez

Puede traer:
2 acompañantes

Confirmados:
1 acompañante
```

---

# Restricciones Alimentarias

Permite registrar:

- alergias
- vegetarianos
- veganos
- celíacos
- observaciones especiales

---

# Ejemplos

```txt
Vegetariano
Sin gluten
Alergia a frutos secos
Kosher
```

---

# Check-In

El check-in se realiza mediante:

- QR token
- scanner
- validación en tiempo real

---

# Flujo

```txt
QR Scan
   ↓
Búsqueda de Invitado
   ↓
Validación
   ↓
Check-In
   ↓
Actualización de Estado
```

---

# Tracking y Analytics

El módulo soporta:

- enviados
- abiertos
- confirmados
- rechazados
- presentes
- pendientes

---

# Métricas posibles

```txt
250 invitados
180 confirmados
120 presentes
15 vegetarianos
22 pendientes
```

---

# Índices

Los índices optimizan:

- búsquedas por evento
- escaneo QR
- búsquedas por email
- filtros por estado

---

# Índices actuales

```txt
event_id
qr_token
status
invitation_status
email
phone
```

---

# Objetivo del Módulo

El módulo de invitados funciona como:

# Guest CRM + Event Operations System

Centraliza:

- asistentes
- acceso
- seating
- confirmaciones
- operación en vivo
- estadísticas
- logística del evento

y sirve como base para:

- Invitations
- Scanner
- Analytics
- Seating
- Catering
- Campaigns
- RSVP Flows