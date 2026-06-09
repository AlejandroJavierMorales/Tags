# Módulo ClientsReviews - Tags

## 1. Objetivo del módulo

**ClientsReviews** es un producto premium de Tags orientado a captar opiniones de clientes mediante un formulario público asociado a un QR.

El objetivo es que un negocio pueda:

- Solicitar feedback privado a sus clientes.
- Medir experiencia con preguntas configurables de 1 a 5 estrellas.
- Registrar comentarios por pregunta.
- Consultar, filtrar y administrar reseñas desde su dashboard.
- Exportar respuestas.
- Generar contenido descargable para redes sociales.
- Invitar al usuario a dejar una reseña pública en Google Reviews.

El módulo se comporta como una variante especializada de QR-Page:

```txt
ClientsReviews = QR-Page especializada + administración propia + respuestas propias
```

No es un sistema separado de QR-Page. Usa la misma lógica base de QR, slug, URL pública y addons.

---

## 2. Relación con QR-Page

ClientsReviews se registra en la tabla existente:

```txt
tags_qr_pages
```

usando:

```txt
page_type = 'client_reviews'
```

Esto permite reutilizar:

- `business_id`
- `qr_code_id`
- `slug`
- `final_url`
- `status`
- `slug_locked`
- publicación pública en `/p/[slug]`
- relación con QR físico/digital
- sistema de addons
- dashboard cliente/admin

La diferencia es que cuando `/p/[slug]` detecta:

```js
page.page_type === "client_reviews"
```

no debe renderizar el renderer normal de QR-Page, sino el formulario público de reseñas.

---

## 3. Relación con Addons

El addon global del módulo es:

```txt
client_reviews
```

Se guarda en:

```txt
tags_addons
```

Cuando un cliente contrata el addon, se registra en:

```txt
tags_business_addons
```

Pero cuando un QR concreto lo usa, se registra en:

```txt
tags_qr_addon_usage
```

La separación es importante:

```txt
tags_business_addons = el cliente contrató el addon
tags_qr_addon_usage = este QR está usando ese addon
```

Ejemplo:

```txt
Cliente 27 contrató:
- qr_page x 1
- tags_id x 1
- client_reviews x 1

QR ABC123 usa:
- client_reviews

QR ZAKA752S usa:
- tags_id
```

---

## 4. Flujo funcional principal

### 4.1 Activación

Desde el dashboard cliente/admin se activa ClientsReviews sobre un QR.

La activación hace lo siguiente:

1. Valida `businessId`, `qrCodeId` y `slug`.
2. Verifica que el QR pertenezca al cliente.
3. Verifica que el QR no tenga otra página asociada.
4. Verifica que el slug esté disponible.
5. Crea una entrada en `tags_qr_pages` con `page_type = 'client_reviews'`.
6. Crea un formulario en `tags_client_review_forms`.
7. Crea preguntas iniciales en `tags_client_review_questions`.
8. Actualiza el QR:
   - `status = 'active'`
   - `final_url = BASE_URL + /p/[slug]`
   - `has_qr_page = 1`
9. Registra el uso del addon en `tags_qr_addon_usage`.

---

### 4.2 Uso público

El usuario escanea el QR y llega a:

```txt
/p/[slug]
```

Si la página es `client_reviews`, se carga el formulario público mediante:

```txt
GET /api/client-reviews/public/get?slug=
```

El usuario responde:

- preguntas de 1 a 5 estrellas;
- comentarios por pregunta;
- comentario general;
- opcionalmente nombre/email/teléfono.

Luego se guarda con:

```txt
POST /api/client-reviews/public/submit
```

La API calcula:

- promedio general;
- calificación mínima;
- calificación máxima;
- si corresponde mostrar CTA hacia Google Reviews.

---

### 4.3 Derivación a Google Reviews

Cada formulario tiene:

```txt
google_review_url
positive_threshold
```

`positive_threshold` define desde qué promedio se considera una experiencia positiva.

Ejemplo:

```txt
positive_threshold = 4
```

Si el promedio es 4 o más, el sistema puede mostrar un mensaje destacado invitando a dejar una reseña en Google.

Importante: para evitar prácticas de review gating, el enlace a Google no debería usarse para bloquear reseñas negativas. Lo más seguro es permitir siempre la opción de reseña pública, pero destacar más el CTA cuando el promedio sea alto.

Cuando el usuario hace click en Google Reviews, se registra con:

```txt
POST /api/client-reviews/public/google-click
```

---

## 5. Tablas del módulo

### 5.1 `tags_client_review_forms`

Guarda la configuración principal del formulario.

Relaciones:

```txt
business_id -> tags_businesses.id
qr_code_id  -> tags_qr_codes.id
page_id     -> tags_qr_pages.id
```

Campos principales:

- `title`
- `subtitle`
- `logo_url`
- `google_review_url`
- `positive_threshold`
- mensajes de éxito
- textos del CTA Google
- textos para feedback privado
- `styles_json`
- `settings_json`
- `status`

Cada QR con ClientsReviews activo tiene un formulario principal.

---

### 5.2 `tags_client_review_questions`

Guarda las preguntas configurables del formulario.

Relación:

```txt
form_id -> tags_client_review_forms.id
```

Cada pregunta puede tener:

- texto principal;
- texto de ayuda;
- etiquetas de rating 1 a 5;
- comentario habilitado o no;
- placeholder del comentario;
- requerido o no;
- visible o no;
- orden;
- estilos/configuración JSON.

---

### 5.3 `tags_client_review_responses`

Guarda cada envío completo del formulario.

Relaciones:

```txt
form_id     -> tags_client_review_forms.id
business_id -> tags_businesses.id
qr_code_id  -> tags_qr_codes.id
page_id     -> tags_qr_pages.id
```

Campos principales:

- datos opcionales del cliente;
- comentario general;
- `average_rating`;
- `min_rating`;
- `max_rating`;
- `google_prompt_shown`;
- `google_clicked`;
- `source`;
- `user_agent`;
- `ip_hash`;
- estado administrativo: `new`, `reviewed`, `archived`.

---

### 5.4 `tags_client_review_answers`

Guarda las respuestas individuales por pregunta.

Relaciones:

```txt
response_id -> tags_client_review_responses.id
form_id     -> tags_client_review_forms.id
question_id -> tags_client_review_questions.id
```

Campos:

- `rating`
- `comment`

---

### 5.5 `tags_client_review_events`

Guarda eventos relacionados al formulario.

Ejemplos:

- click en Google Reviews;
- futura descarga de pieza social;
- futura exportación;
- futura interacción pública.

Campos principales:

- `response_id`
- `form_id`
- `business_id`
- `qr_code_id`
- `event_type`
- `event_data`

---

## 6. APIs del módulo

### 6.1 Activación

```txt
POST /api/client-reviews/activate
```

Crea todo lo necesario para activar ClientsReviews en un QR.

Body esperado:

```json
{
  "businessId": 27,
  "qrCodeId": 123,
  "slug": "mi-negocio-reviews"
}
```

Crea:

- `tags_qr_pages`
- `tags_client_review_forms`
- preguntas default;
- `tags_qr_addon_usage`

Actualiza:

- `tags_qr_codes.final_url`
- `tags_qr_codes.status`
- `tags_qr_codes.has_qr_page`

---

### 6.2 Obtener configuración admin

```txt
GET /api/client-reviews/admin/get?businessId=&qrCodeId=
```

Devuelve:

- página QR-Page especializada;
- formulario;
- preguntas;
- resumen básico de respuestas.

Uso:

```txt
Pantalla administrativa del cliente
```

---

### 6.3 Actualizar configuración general

```txt
POST /api/client-reviews/admin/update-form
```

Actualiza:

- título;
- subtítulo;
- logo;
- link Google Reviews;
- umbral positivo;
- mensajes finales;
- textos del CTA Google;
- estilos;
- settings.

---

### 6.4 Guardar preguntas

```txt
POST /api/client-reviews/admin/questions/save
```

Permite:

- crear preguntas;
- editar preguntas;
- reordenar;
- ocultar;
- marcar como requeridas;
- eliminar las que ya no están en el array enviado.

---

### 6.5 Obtener formulario público

```txt
GET /api/client-reviews/public/get?slug=
```

Lo usa la página pública `/p/[slug]` cuando `page_type = 'client_reviews'`.

Devuelve:

- página;
- formulario;
- preguntas visibles.

---

### 6.6 Enviar respuesta pública

```txt
POST /api/client-reviews/public/submit
```

Guarda una respuesta completa.

Body esperado aproximado:

```json
{
  "formId": 1,
  "customer_name": "Juan",
  "customer_email": "juan@email.com",
  "customer_phone": "",
  "general_comment": "Muy buena atención",
  "answers": [
    {
      "question_id": 10,
      "rating": 5,
      "comment": "Excelente"
    }
  ]
}
```

Calcula:

- promedio;
- mínimo;
- máximo;
- si se muestra CTA Google.

---

### 6.7 Registrar click en Google Reviews

```txt
POST /api/client-reviews/public/google-click
```

Body:

```json
{
  "responseId": 55
}
```

Actualiza:

```txt
google_clicked = 1
```

También registra evento:

```txt
event_type = 'google_click'
```

---

### 6.8 Listar respuestas admin

```txt
GET /api/client-reviews/admin/responses/list?businessId=&formId=&rating=&from=&to=&status=&q=&page=&limit=
```

Permite filtrar por:

- negocio;
- formulario;
- rating redondeado;
- fecha desde/hasta;
- estado administrativo;
- búsqueda por nombre/email/teléfono/comentario;
- paginación.

---

### 6.9 Obtener detalle de respuesta

```txt
GET /api/client-reviews/admin/responses/get?id=&businessId=
```

Devuelve:

- respuesta general;
- respuestas individuales por pregunta.

---

### 6.10 Cambiar estado de respuesta

```txt
POST /api/client-reviews/admin/responses/status
```

Estados permitidos:

```txt
new
reviewed
archived
```

---

### 6.11 Export CSV

```txt
GET /api/client-reviews/admin/export/csv?businessId=&formId=&from=&to=
```

Exporta respuestas generales en CSV.

Pendiente futuro:

```txt
Export PDF
```

---

### 6.12 Datos para pieza social

```txt
GET /api/client-reviews/admin/social-card/data?responseId=&businessId=
```

Devuelve información de una reseña para generar una pieza visual descargable.

Uso futuro:

- post cuadrado;
- historia vertical;
- imagen para Instagram;
- pieza para reel.

---

## 7. Integración con `/p/[slug]`

La página pública debe resolver primero la página por slug.

Si encuentra:

```js
page_type === "client_reviews"
```

entonces debe renderizar el formulario ClientsReviews.

Pseudo flujo:

```js
if (page.page_type === "client_reviews") {
  return <ClientReviewsPublicRenderer slug={slug} />;
}

return <QRPagePublicRenderer page={page} />;
```

---

## 8. Integración con dashboard cliente

En el dashboard del cliente, cada QR puede mostrar features activas desde:

```txt
tags_qr_addon_usage
```

Para ClientsReviews:

```txt
addon_code = 'client_reviews'
```

Botón esperado:

```txt
Administrar Reviews
```

Ruta sugerida:

```txt
/dashboard/businesses/[businessId]/qrs/[qrId]/client-reviews
```

Si el QR no tiene ClientsReviews activo pero el cliente tiene cupo disponible:

```txt
Activar ClientsReviews
```

---

## 9. Integración con dashboard admin QR

En el dashboard admin de QRs, la columna de features debería leer:

```txt
tags_qr_addon_usage
```

Ejemplo visual:

```txt
QR-Page
TagsID
Clients Reviews
Custom Domain
```

Un mismo QR puede tener múltiples features:

```txt
Clients Reviews + Custom Domain
```

---

## 10. Consideraciones de performance

Para escalar a miles de QRs:

- mantener paginación;
- filtrar por índices;
- usar `tags_qr_addon_usage` para no inferir features con joins pesados;
- no calcular uso por QR desde `tags_business_addons`;
- usar `GROUP_CONCAT` solo sobre resultados paginados;
- indexar `addon_code`, `qr_code_id`, `business_id` y `status`.

Índices clave:

```sql
UNIQUE KEY uq_qr_addon_usage (qr_code_id, addon_code)
KEY idx_qr_status (qr_code_id, status)
KEY idx_addon_status (addon_code, status)
KEY idx_business_addon_status (business_id, addon_code, status)
```

---

## 11. Consideraciones legales / política Google

El sistema debe evitar prácticas de review gating.

No conviene bloquear el acceso a Google Reviews solo para usuarios con baja calificación.

Modelo recomendado:

- siempre registrar feedback privado;
- mostrar CTA a Google Reviews de manera ética;
- destacar más el CTA cuando la experiencia fue positiva;
- no impedir que alguien deje reseña pública por haber calificado bajo.

---

## 12. Pendientes de implementación

- Crear frontend de activación.
- Crear dashboard admin personalizado.
- Crear renderer público.
- Integrar en `/p/[slug]`.
- Integrar en dashboard cliente.
- Integrar en dashboard admin QR features.
- Agregar export PDF.
- Agregar generador visual de pieza social.
- Agregar soporte para estilos avanzados tipo QR-Page.
- Agregar templates visuales.
