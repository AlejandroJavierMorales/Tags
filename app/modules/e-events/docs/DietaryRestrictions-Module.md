# Dietary Restrictions Module — Documentación Técnica

# Objetivo

El módulo de Dietary Restrictions permite:

- Registrar restricciones alimentarias por invitado.
- Estandarizar restricciones para catering.
- Filtrar invitados por restricciones.
- Generar reportes operativos.
- Diferenciar preferencias de alergias críticas.
- Mantener compatibilidad con el sistema legacy basado en `dietary_notes`.

---

# Arquitectura General

El módulo utiliza:

## Tabla principal de restricciones

```sql
tags_event_dietary_restrictions
```

Define las restricciones disponibles para cada evento.

Ejemplos:

- Vegano
- Vegetariano
- Celíaco
- Kosher
- Halal
- Alergia a frutos secos

---

## Tabla relacional

```sql
tags_event_attendee_dietary_relations
```

Relaciona invitados con restricciones.

Permite:

- múltiples restricciones por invitado
- consultas rápidas
- reportes agrupados
- filtros avanzados

---

## Campo legacy compatible

```sql
tags_event_attendees.dietary_notes
```

NO se elimina.

Continúa utilizándose para:

- notas libres
- comentarios manuales
- compatibilidad legacy
- observaciones especiales

Ejemplos:

- "No le gusta el pescado"
- "Sin picante"
- "Alergia leve no confirmada"

---

# Tabla: tags_event_dietary_restrictions

## Estructura

```sql
CREATE TABLE tags_event_dietary_restrictions (

    id INT NOT NULL AUTO_INCREMENT,

    event_id INT DEFAULT NULL,

    name VARCHAR(120) NOT NULL,

    slug VARCHAR(120) NOT NULL,

    color VARCHAR(20) DEFAULT NULL,

    icon VARCHAR(50) DEFAULT NULL,

    is_system TINYINT(1) NOT NULL DEFAULT 0,

    severity ENUM(
        'preference',
        'allergy',
        'critical'
    ) NOT NULL DEFAULT 'preference',

    requires_kitchen_attention TINYINT(1)
        NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NULL
        DEFAULT NULL
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_event_id (event_id),

    KEY idx_slug (slug),

    KEY idx_system (is_system)

);
```

---

# Campos

| Campo | Descripción |
|---|---|
| id | ID único |
| event_id | Evento propietario |
| name | Nombre visible |
| slug | Identificador técnico |
| color | Color UI |
| icon | Icono opcional |
| is_system | Restricción del sistema |
| severity | Nivel de severidad |
| requires_kitchen_attention | Requiere atención especial |
| created_at | Fecha creación |
| updated_at | Última actualización |

---

# Severity

## preference

Preferencia alimentaria.

Ejemplos:

- Vegetariano
- Vegano

---

## allergy

Alergia importante.

Ejemplos:

- Gluten
- Lactosa

---

## critical

Riesgo crítico.

Ejemplos:

- Frutos secos
- Mariscos
- Anafilaxia

---

# requires_kitchen_attention

Indica si catering debe tomar acción especial.

Valores:

| Valor | Significado |
|---|---|
| 0 | Informativo |
| 1 | Atención requerida |

---

# Tabla: tags_event_attendee_dietary_relations

## Estructura

```sql
CREATE TABLE tags_event_attendee_dietary_relations (

    attendee_id INT NOT NULL,

    restriction_id INT NOT NULL,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (
        attendee_id,
        restriction_id
    ),

    KEY idx_attendee (
        attendee_id
    ),

    KEY idx_restriction (
        restriction_id
    ),

    CONSTRAINT fk_attendee_dietary_attendee
    FOREIGN KEY (
        attendee_id
    )
    REFERENCES tags_event_attendees(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_attendee_dietary_restriction
    FOREIGN KEY (
        restriction_id
    )
    REFERENCES tags_event_dietary_restrictions(id)
    ON DELETE CASCADE

);
```

---

# Relación

## Un invitado puede tener:

- múltiples restricciones

## Una restricción puede pertenecer a:

- múltiples invitados

Relación:

```text
N:N
```

---

# Funcionamiento Frontend

## Selección múltiple

El usuario puede seleccionar:

- Vegano
- Celíaco
- Alergia frutos secos

simultáneamente.

---

# Flujo de guardado

## 1. Crear / editar invitado

Se actualiza:

```sql
tags_event_attendees
```

---

## 2. Limpiar relaciones anteriores

```sql
DELETE FROM
tags_event_attendee_dietary_relations
WHERE attendee_id = ?
```

---

## 3. Insertar nuevas relaciones

```sql
INSERT INTO
tags_event_attendee_dietary_relations
(
    attendee_id,
    restriction_id
)
VALUES (?, ?)
```

---

# Compatibilidad Legacy

## dietary_notes permanece activo

NO reemplazar.

Continúa funcionando.

---

# Uso recomendado

## dietary restrictions

Para:

- filtros
- estadísticas
- catering
- reportes
- alertas

---

## dietary_notes

Para:

- texto libre
- aclaraciones
- observaciones manuales

---

# Ejemplo Real

## Restricciones seleccionadas

- Vegano
- Gluten Free

## dietary_notes

```text
Sin cebolla
```

---

# Consultas útiles

## Obtener restricciones de un invitado

```sql
SELECT

    r.id,
    r.name,
    r.color,
    r.severity

FROM
tags_event_attendee_dietary_relations rel

INNER JOIN
tags_event_dietary_restrictions r
    ON r.id = rel.restriction_id

WHERE
rel.attendee_id = ?
```

---

# Obtener invitados celíacos

```sql
SELECT

    a.id,
    a.name

FROM
tags_event_attendee_dietary_relations rel

INNER JOIN
tags_event_attendees a
    ON a.id = rel.attendee_id

INNER JOIN
tags_event_dietary_restrictions r
    ON r.id = rel.restriction_id

WHERE
r.slug = 'celiac'
```

---

# Obtener alertas críticas

```sql
SELECT

    a.name,
    r.name AS restriction_name

FROM
tags_event_attendee_dietary_relations rel

INNER JOIN
tags_event_attendees a
    ON a.id = rel.attendee_id

INNER JOIN
tags_event_dietary_restrictions r
    ON r.id = rel.restriction_id

WHERE
r.severity = 'critical'
```

---

# Recomendaciones UI

## Colores sugeridos

| Severity | Color |
|---|---|
| preference | verde |
| allergy | naranja |
| critical | rojo |

---

# Recomendaciones operativas

## Catering

Mostrar:

- icono
- color
- nombre
- severidad

---

## Check-in

Mostrar alertas críticas visuales.

Ejemplo:

```text
⚠️ ALERGIA A MANÍ
```

---

# Recomendaciones futuras

## Posibles fases posteriores

- iconos oficiales
- traducciones
- templates por evento
- restricciones globales por negocio
- exportación PDF catering
- agrupación automática
- impresión cocina
- menú adaptado
- IA para detección de conflictos alimentarios

---

# Compatibilidad del sistema

Compatible con:

- attendees
- companions
- tables
- catering
- reports
- qr checkin
- mobile staff
- exports

---

# Estado actual

## Implementado

- tablas
- relaciones
- estructura SQL
- compatibilidad legacy

## Próximo paso recomendado

- CRUD de restricciones
- selector multi-tag
- filtros frontend
- reportes catering
- badges visuales
- alerts UI
