# Dietary Restrictions Module — API Documentation

---

# Overview

El módulo de restricciones alimentarias está dividido en 2 grandes grupos:

1. Gestión de restricciones alimentarias
2. Relaciones Invitado ↔ Restricciones

Además se mantienen los campos:

- `dietary_notes`
- `custom_dietary_notes`

como soporte manual/libre y snapshot textual histórico.

---

# DATABASE TABLES

## Restrictions

```sql
tags_event_dietary_restrictions
```

## Relations

```sql
tags_event_attendee_dietary_relations
```

---

# 1. DIETARY RESTRICTIONS

Gestión de restricciones configurables por evento.

Ejemplos:

- Vegano
- Vegetariano
- Celíaco
- Halal
- Kosher
- Alergia a frutos secos

---

# APIs

## Create Restriction

```http
POST /api/events/dietary-restrictions/create
```

### Body

```json
{
  "event_id": 1,
  "name": "Celíaco",
  "slug": "celiac",
  "color": "#ef4444",
  "severity": "critical",
  "requires_kitchen_attention": true
}
```

---

## Update Restriction

```http
PUT /api/events/dietary-restrictions/update
```

### Body

```json
{
  "id": 5,
  "name": "Vegano",
  "slug": "vegan",
  "color": "#22c55e"
}
```

---

## Delete Restriction

```http
DELETE /api/events/dietary-restrictions/delete
```

### Body

```json
{
  "id": 5
}
```

---

## List Restrictions

```http
GET /api/events/dietary-restrictions/list?event_id=1
```

---

# VALIDATIONS

## CREATE / UPDATE

Validar:

- `event_id`
- `name`
- `slug`
- `color` opcional
- `slug` único por evento

---

# PERMISSIONS

| Acción | Permission |
|---|---|
| Crear | dietary_restrictions.create |
| Editar | dietary_restrictions.update |
| Eliminar | dietary_restrictions.delete |
| Ver | dietary_restrictions.view |

---

# EVENT LOGS

## Create

```js
actionCode:
    "dietary_restrictions.create"
```

## Update

```js
actionCode:
    "dietary_restrictions.update"
```

## Delete

```js
actionCode:
    "dietary_restrictions.delete"
```

---

# 2. ATTENDEE ↔ DIETARY RELATIONS

Relaciones normalizadas entre invitados y restricciones alimentarias.

Permite múltiples restricciones por invitado.

Ejemplo:

- Vegano
- Celíaco
- Sin cebolla
- Alergia a frutos secos

---

# APIs

## Save Relations

```http
POST /api/events/attendee-dietary-relations/save
```

### Body

```json
{
  "attendee_id": 15,
  "restriction_ids": [1,2,5],
  "custom_dietary_notes": "No cebolla"
}
```

---

# Esta API debe:

- eliminar relaciones anteriores
- insertar nuevas relaciones
- actualizar:
  - `dietary_notes`
  - `custom_dietary_notes`

---

## Get Attendee Restrictions

```http
GET /api/events/attendee-dietary-relations/list?attendee_id=15
```

---

# VALIDATIONS

## SAVE RELATIONS

Validar:

- attendee existe
- attendee pertenece al business
- restriction pertenece al mismo evento
- no duplicar IDs
- `restriction_ids` es array válido

---

# PERMISSIONS

| Acción | Permission |
|---|---|
| Asignar | attendee_dietary.update |
| Ver | attendee_dietary.view |

---

# EVENT LOGS

## Update Relations

```js
actionCode:
    "attendee_dietary.update"
```

---

# 3. REPORTS

Módulo orientado a catering, cocina y logística del evento.

---

# APIs

## Catering Summary

```http
GET /api/events/dietary-reports/summary?event_id=1
```

### Response

```json
{
  "vegan": 12,
  "celiac": 4,
  "nut_allergy": 2
}
```

---

## Attendees By Restriction

```http
GET /api/events/dietary-reports/by-restriction?event_id=1&restriction_id=5
```

---

## Kitchen Alerts

```http
GET /api/events/dietary-reports/kitchen-alerts?event_id=1
```

---

# Kitchen Alerts Rules

Retornar solamente:

```sql
severity = 'critical'
OR requires_kitchen_attention = 1
```

---

# RECOMMENDED STRUCTURE

```bash
/api/events/dietary-restrictions/
    create/route.js
    update/route.js
    delete/route.js
    list/route.js

/api/events/attendee-dietary-relations/
    save/route.js
    list/route.js

/api/events/dietary-reports/
    summary/route.js
    by-restriction/route.js
    kitchen-alerts/route.js
```

---

# FRONTEND TRANSLATIONS

Mostrar SIEMPRE en español.

NO traducir valores en DB.

Traducir solamente en frontend.

| DB | Front |
|---|---|
| Vegan | Vegano |
| Vegetarian | Vegetariano |
| Celiac | Celíaco |
| Nut Allergy | Alergia a frutos secos |
| Halal | Halal |
| Kosher | Kosher |

---

# IMPORTANT RECOMMENDATION

NO eliminar:

```sql
dietary_notes
```

porque:

- ya lo usa el sistema
- sirve para exportaciones rápidas
- sirve para snapshots históricos
- evita romper módulos existentes

---

# RECOMMENDED USAGE

Usar `dietary_notes` como snapshot textual.

Ejemplo:

```txt
Vegano, Celíaco, Sin cebolla
```

aunque internamente existan relaciones normalizadas.

---

# BENEFITS

Mantener snapshot textual evita:

- joins innecesarios
- problemas históricos
- problemas de exportación
- inconsistencias futuras
- breaking changes

y simplifica muchísimo reportes rápidos y debugging.