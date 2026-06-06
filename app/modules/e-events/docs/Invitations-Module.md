# Sistema de Invitaciones - Tags Eventos

## Objetivo General

Desarrollar un sistema de invitaciones moderno, flexible y reutilizable para Tags Eventos, que permita:

- Crear invitaciones digitales personalizadas
- Diseñar templates reutilizables
- Asociar invitados y grupos
- Integrar RSVP
- Mostrar QR
- Compartir links públicos
- Reutilizar arquitectura para futuros micrositios de compradores de tickets

La idea principal es:

> construir un motor de páginas dinámicas reutilizable, donde las invitaciones sean simplemente el primer caso de uso.

---

# Filosofía del Sistema

El sistema NO debe ser:

- un constructor visual infinito tipo Wix
- un editor drag-and-drop complejo
- un CMS completamente libre

Porque eso:

- multiplica complejidad
- rompe consistencia visual
- hace imposible mantener UX de calidad
- vuelve imposible reutilizar componentes

En cambio:

## El enfoque correcto

Sistema basado en:

- templates
- bloques reutilizables
- configuración controlada
- themes
- presets
- slots de contenido

---

# Arquitectura Conceptual

El sistema se divide en 5 capas:

| Capa | Función |
|---|---|
| Engine | Motor de render dinámico |
| Templates | Diseños base |
| Blocks | Componentes reutilizables |
| Data | Datos del evento/invitado |
| Delivery | Links, QR, RSVP |

---

# Concepto Central

Una invitación NO es HTML guardado.

Una invitación es:

```json
{
  "template": "modern_wedding",
  "theme": "gold_dark",
  "blocks": [],
  "settings": {},
  "event_data": {},
  "guest_data": {}
}
```

El frontend renderiza dinámicamente usando:

- template
- configuración
- bloques
- datos

---

# Beneficio Principal

Cuando en el futuro construyamos:

- micrositios para compradores
- páginas de sponsors
- mini landing pages
- páginas de speakers
- perfiles públicos
- páginas de mesas VIP

TODO reutiliza:

- engine
- renderer
- themes
- blocks
- layouts

---

# Estructura del Sistema

# 1. Templates

Los templates definen:

- layout general
- estructura visual
- comportamiento responsive
- zonas disponibles

Ejemplos:

- Modern Wedding
- Corporate Minimal
- Elegant Black
- Birthday Neon
- Festival Ticket
- Conference Pro

---

# Tabla: tags_event_invitation_templates

```sql
CREATE TABLE tags_event_invitation_templates (

    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    slug VARCHAR(100) UNIQUE,

    name VARCHAR(255),

    category VARCHAR(100),

    preview_image TEXT,

    description TEXT,

    is_system TINYINT(1) DEFAULT 1,

    is_active TINYINT(1) DEFAULT 1,

    config_json JSON,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

# Qué guarda config_json

```json
{
  "supports_cover": true,
  "supports_gallery": true,
  "supports_countdown": true,
  "supports_rsvp": true,
  "supports_map": true,
  "supports_music": false
}
```

---

# 2. Themes

Separar template de theme.

El template define estructura.

El theme define:

- colores
- tipografías
- estilos
- bordes
- sombras
- spacing

---

# Tabla: tags_event_invitation_themes

```sql
CREATE TABLE tags_event_invitation_themes (

    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    slug VARCHAR(100) UNIQUE,

    name VARCHAR(255),

    config_json JSON,

    preview_image TEXT,

    is_system TINYINT(1) DEFAULT 1,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

# Ejemplo config_json

```json
{
  "background": "#0f0f0f",
  "text": "#ffffff",
  "primary": "#d4af37",
  "font_title": "Playfair Display",
  "font_body": "Inter"
}
```

---

# 3. Invitations

Representa una invitación concreta.

---

# Tabla: tags_event_invitations

```sql
CREATE TABLE tags_event_invitations (

    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    event_id BIGINT NOT NULL,

    template_id BIGINT,

    theme_id BIGINT,

    title VARCHAR(255),

    slug VARCHAR(255),

    cover_image TEXT,

    settings_json JSON,

    is_public TINYINT(1) DEFAULT 1,

    requires_password TINYINT(1) DEFAULT 0,

    password_hash TEXT,

    published_at DATETIME,

    created_by BIGINT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

# Qué guarda settings_json

```json
{
  "show_countdown": true,
  "show_map": true,
  "show_rsvp": true,
  "background_music": true,
  "animation_level": "medium"
}
```

---

# 4. Blocks

Los bloques son componentes reutilizables.

Ejemplos:

- Hero
- Cover
- Countdown
- Schedule
- Gallery
- RSVP
- Dresscode
- GiftList
- StoryTimeline
- LocationMap
- ContactBlock
- QRBlock

---

# Tabla: tags_event_invitation_blocks

```sql
CREATE TABLE tags_event_invitation_blocks (

    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    invitation_id BIGINT NOT NULL,

    type VARCHAR(100),

    position INT,

    config_json JSON,

    is_active TINYINT(1) DEFAULT 1,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

# Ejemplo config_json

```json
{
  "title": "Dress Code",
  "text": "Elegante Sport",
  "icon": "faShirt"
}
```

---

# 5. Guests

Relación invitación ↔ invitados.

---

# Tabla: tags_event_invitation_guests

```sql
CREATE TABLE tags_event_invitation_guests (

    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    invitation_id BIGINT NOT NULL,

    attendee_id BIGINT,

    access_token VARCHAR(255),

    qr_code TEXT,

    max_companions INT DEFAULT 0,

    personalized_message TEXT,

    rsvp_status ENUM(
        'pending',
        'confirmed',
        'declined'
    ) DEFAULT 'pending',

    viewed_at DATETIME,

    confirmed_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

# Concepto Importante

Cada invitado puede tener:

- link único
- QR único
- mensaje personalizado
- permisos específicos
- acompañantes distintos

---

# URLs Públicas

Ejemplos:

```txt
/invitation/abc123
/invitation/abc123?rsvp=true
/invitation/abc123/guest/xyz987
```

---

# 6. RSVP

Separar RSVP como entidad.

---

# Tabla: tags_event_invitation_rsvps

```sql
CREATE TABLE tags_event_invitation_rsvps (

    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    invitation_guest_id BIGINT,

    status ENUM(
        'confirmed',
        'declined',
        'pending'
    ),

    companions_count INT DEFAULT 0,

    dietary_notes TEXT,

    message TEXT,

    responded_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

# Motor de Render

El frontend hará algo así:

```jsx
blocks.map(block => {

    switch(block.type) {

        case "hero":
            return <HeroBlock {...block} />

        case "countdown":
            return <CountdownBlock {...block} />

        case "gallery":
            return <GalleryBlock {...block} />
    }
})
```

---

# Reutilización Futura

| Feature futura | Reutiliza |
|---|---|
| Micrositios compradores | templates + blocks |
| Sponsors | blocks |
| Landing ecommerce | renderer |
| Speakers | themes |
| Perfiles públicos | engine |
| Landing SaaS | layouts |

---

# APIs Principales

# Templates

```txt
GET    /api/events/invitation-templates/list
GET    /api/events/invitation-templates/get
POST   /api/events/invitation-templates/create
POST   /api/events/invitation-templates/update
POST   /api/events/invitation-templates/delete
```

---

# Themes

```txt
GET    /api/events/invitation-themes/list
GET    /api/events/invitation-themes/get
POST   /api/events/invitation-themes/create
POST   /api/events/invitation-themes/update
POST   /api/events/invitation-themes/delete
```

---

# Invitations

```txt
GET    /api/events/invitations/list
GET    /api/events/invitations/get
POST   /api/events/invitations/create
POST   /api/events/invitations/update
POST   /api/events/invitations/delete
POST   /api/events/invitations/publish
POST   /api/events/invitations/unpublish
```

---

# Blocks

```txt
GET    /api/events/invitation-blocks/list
POST   /api/events/invitation-blocks/create
POST   /api/events/invitation-blocks/update
POST   /api/events/invitation-blocks/delete
POST   /api/events/invitation-blocks/reorder
```

---

# Guests

```txt
GET    /api/events/invitation-guests/list
POST   /api/events/invitation-guests/add
POST   /api/events/invitation-guests/remove
POST   /api/events/invitation-guests/generate-link
POST   /api/events/invitation-guests/generate-qr
```

---

# RSVP

```txt
POST   /api/events/rsvp/respond
GET    /api/events/rsvp/list
GET    /api/events/rsvp/stats
```

---

# Builder Visual

## Primera Etapa

NO hacer drag and drop.

Primero:

- lista de bloques
- orden manual
- edición simple
- preview en tiempo real

---

# Componentes Reutilizables

| Componente | Reutilizable futuro |
|---|---|
| HeroBlock | Sí |
| GalleryBlock | Sí |
| CountdownBlock | Sí |
| MapBlock | Sí |
| CTAButtonBlock | Sí |
| QRBlock | Sí |
| ContactBlock | Sí |

---

# Arquitectura Recomendada Frontend

```txt
/modules/e-events/invitations/
```

---

# Estructura Recomendada

```txt
/components
    InvitationRenderer
    InvitationPreview
    InvitationBuilder
    BlockRenderer
    blocks/

/templates
/themes/

/lib
/services
/hooks
```

---

# Recomendación Técnica

Guardar SIEMPRE:

- estructura en DB
- configuración en JSON
- render en frontend

NO guardar HTML final.

---

# Seguridad

Las invitaciones privadas deben usar:

- tokens
- expiración opcional
- validación de acceso
- rate limit RSVP

---

# Escalabilidad

Este sistema permitirá:

- múltiples templates
- marketplace futuro
- themes premium
- sistema white-label
- páginas dinámicas reutilizables

sin rehacer arquitectura.

---

# Conclusión

La clave es:

NO construir "invitaciones".

Construir:

> un motor de páginas dinámicas reutilizable.

Las invitaciones son simplemente el primer producto construido sobre ese motor.