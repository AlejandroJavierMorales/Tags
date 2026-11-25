# Ruta 100 Córdoba — Modelo lógico mínimo del corredor

**Fecha:** 1 de noviembre de 2026  
**Estado:** Ítem 3 cerrado — diseño lógico, sin SQL ni cambios de base de datos

## 1. Objetivo

Definir la extensión mínima necesaria para representar Ruta 100 como corredor turístico ordenado, reutilizando las entidades existentes de Tags para sitios, localidades, prestadores, contenidos turísticos, fuentes, medios y puntos QR.

El modelo se diseña con nombres genéricos `tags_destination_*` para que pueda reutilizarse en futuros corredores sin convertir Ruta 100 en lógica hardcodeada.

## 2. Entidades nuevas propuestas

## 2.1 Corredor

Nombre conceptual: `tags_destination_corridors`.

Representa un corredor turístico dentro de un sitio.

Campos lógicos:

- `id`;
- `site_id`;
- `code` estable interno;
- `slug` público;
- `name`;
- `eyebrow` o denominación breve;
- `summary`;
- `description`;
- `start_place_id`;
- `end_place_id`;
- `distance_km`;
- `geometry_json`;
- `bounds_json`;
- `source_id`;
- `source_url`;
- `source_checked_at`;
- `status`;
- `created_by_id`, `updated_by_id`, `reviewed_by_id`;
- `reviewed_at`, `published_at`;
- `created_at`, `updated_at`.

Reglas:

- código y slug únicos por sitio;
- un corredor publicado debe tener nombre, resumen, fuente y geometría válida;
- no se elimina físicamente si alguna vez fue publicado: se archiva;
- Ruta 100 tendrá inicialmente un corredor activo.

## 2.2 Tramo

Nombre conceptual: `tags_destination_segments`.

Representa una parte ordenada del corredor.

Campos lógicos:

- `id`;
- `corridor_id`;
- `code`;
- `slug`;
- `name`;
- `summary` y `description`;
- `start_place_id` y `end_place_id`;
- `sort_order`;
- `distance_km`;
- `estimated_minutes`;
- `geometry_json`;
- `bounds_json`;
- `road_info_json`;
- `practical_json`;
- `source_id`, `source_url`, `source_checked_at`;
- `status`;
- campos de creación, revisión y publicación.

`road_info_json` podrá contener información descriptiva como rutas involucradas, superficie o advertencias, pero no se presentará como estado vial en tiempo real sin una fuente específica.

Reglas:

- código y slug únicos dentro del corredor;
- el orden define la continuidad;
- origen y destino deben pertenecer a la secuencia territorial del tramo;
- distancia y duración deben indicar fuente o método de cálculo;
- un tramo publicado debe tener geometría válida;
- el orden se puede modificar sin cambiar el slug.

## 2.3 Relación tramo–lugar

Nombre conceptual: `tags_destination_segment_places`.

Representa localidades, comunas, parajes u otros lugares relacionados con un tramo.

Campos lógicos:

- `segment_id`;
- `place_id`;
- `relation_type`;
- `sort_order`;
- `distance_from_start_km` opcional;
- `is_featured`;
- `notes` editoriales opcionales.

Tipos iniciales:

- `start`;
- `through`;
- `stop`;
- `end`;
- `nearby`.

Reglas:

- una combinación tramo, lugar y tipo no se repite;
- `start` y `end` deben coincidir con los extremos del tramo;
- `nearby` indica proximidad editorial y no afirma que la ruta atraviese el lugar;
- el orden no se deduce alfabéticamente.

## 2.4 Perfil territorial de un lugar por sitio

Nombre conceptual: `tags_destination_place_profiles`.

Extiende `tags_geo_places` sin duplicar la localidad ni alterar su identidad global.

Campos lógicos:

- `id`;
- `site_id`;
- `place_id`;
- `public_slug`;
- `title`;
- `summary`;
- `description`;
- `history_text` opcional;
- `practical_json`;
- `cover_image_url`;
- `images_json`;
- `seo_title`, `seo_description`;
- `is_emerging_destination`;
- `is_on_corridor`;
- `sort_order` general opcional;
- `source_id`, `source_url`, `source_checked_at`;
- `status`;
- campos de creación, revisión y publicación.

Reglas:

- un solo perfil por sitio y lugar;
- el nombre y las coordenadas básicas continúan en `tags_geo_places`;
- el perfil puede permanecer en borrador aunque el lugar geográfico esté activo;
- solo perfiles publicados y con contenido mínimo entran al sitemap;
- `public_slug` será único dentro del sitio;
- las imágenes deben conservar crédito y permiso en `images_json` siguiendo el contrato turístico existente.

## 2.5 Experiencia temática

Nombre conceptual: `tags_destination_experiences`.

Representa cada una de las diez experiencias oficiales como producto editorial, no como rubro comercial.

Campos lógicos:

- `id`;
- `site_id`;
- `code`;
- `slug`;
- `name`;
- `short_name`;
- `summary`;
- `description`;
- `sort_order`;
- `icon_url`;
- `cover_image_url`;
- `theme_json`;
- `practical_json`;
- `seo_title`, `seo_description`;
- `source_id`, `source_url`, `source_checked_at`;
- `status`;
- campos de creación, revisión y publicación.

Reglas:

- código y slug únicos por sitio;
- las diez experiencias iniciales se cargan en orden editorial aprobado;
- una experiencia no crea automáticamente un rubro;
- el color o icono nunca será la única forma de identificarla;
- solo las publicadas aparecerán en navegación y sitemap.

## 2.6 Relaciones de experiencia

Se proponen relaciones explícitas y consultables.

### Experiencia–contenido

Nombre conceptual: `tags_destination_experience_contents`.

- `experience_id`;
- `content_id` de `tags_ai_tourism_contents`;
- `relation_type`;
- `sort_order`;
- `is_featured`.

Tipos iniciales: `primary`, `related`, `recommended`.

### Experiencia–lugar

Nombre conceptual: `tags_destination_experience_places`.

- `experience_id`;
- `place_id`;
- `sort_order`;
- `is_featured`.

Esta relación permite afirmar editorialmente que una localidad participa de una experiencia aunque todavía no tenga atractivos cargados.

### Experiencia–tramo

Nombre conceptual: `tags_destination_experience_segments`.

- `experience_id`;
- `segment_id`;
- `sort_order`;
- `is_featured`.

No se utilizará una relación polimórfica genérica `target_type + target_id`, porque sería más difícil de validar, indexar y mantener.

## 2.7 Auditoría territorial

Nombre conceptual: `tags_destination_audit_log`.

Registro inmutable de cambios relevantes.

Campos lógicos:

- `id`;
- `site_id`;
- `entity_type`;
- `entity_id`;
- `action`;
- `actor_type` y `actor_id`;
- `summary`;
- `changes_json` con valores relevantes antes/después;
- `created_at`.

Acciones mínimas:

- crear;
- editar;
- enviar a revisión;
- aprobar;
- publicar;
- despublicar;
- archivar;
- reordenar;
- vincular o desvincular.

El log no sustituye los campos `updated_at` y `reviewed_at`; los complementa.

## 3. Entidades existentes vinculadas

```text
tags_directory_sites
  └── tags_destination_corridors
      └── tags_destination_segments
          └── tags_destination_segment_places ── tags_geo_places

tags_geo_places
  └── tags_destination_place_profiles

tags_destination_experiences
  ├── tags_destination_experience_places ── tags_geo_places
  ├── tags_destination_experience_segments ── segments
  └── tags_destination_experience_contents ── tags_ai_tourism_contents

tags_directory_listings
  └── continúan relacionados territorialmente mediante
      tags_directory_listing_places
```

## 4. Estados editoriales

Todos los registros editoriales principales utilizarán el mismo ciclo:

```text
draft → in_review → published
                 ↘ observed
published → hidden
published/hidden/draft → archived
```

Estados propuestos:

- `draft`: trabajo interno;
- `in_review`: pendiente de validación;
- `observed`: requiere correcciones;
- `published`: visible e indexable si cumple requisitos;
- `hidden`: despublicado, no visible ni indexable;
- `archived`: conservado para historial, no operativo.

Reglas:

- publicar y despublicar serán acciones explícitas;
- `hidden` no equivale a eliminar;
- un contenido despublicado debe salir de sitemap y consultas públicas;
- archivar una entidad con dependencias publicadas debe bloquearse o requerir resolución previa;
- ninguna suscripción comercial modifica estos estados.

## 5. Geometría

## 5.1 Formato inicial

Se propone almacenar geometría como GeoJSON validado en `geometry_json`:

```json
{
  "type": "LineString",
  "coordinates": [
    [-64.8, -30.7],
    [-64.7, -30.8]
  ]
}
```

Reglas:

- orden obligatorio `[longitud, latitud]`;
- tipo permitido inicialmente: `LineString`;
- validación en servidor;
- límites de cantidad de puntos y tamaño;
- origen y fecha de la geometría registrados;
- `bounds_json` calculado al guardar;
- no aceptar geometría arbitraria enviada por un usuario público.

## 5.2 Motivo

- es portable entre MySQL y MariaDB;
- se consume directamente en mapas web;
- evita depender inicialmente de funciones espaciales distintas entre instalaciones;
- el corredor tendrá pocos registros y no necesita consultas espaciales complejas en la primera etapa.

No se utilizará `CAST(? AS JSON)`. Los documentos se validarán, combinarán en aplicación y guardarán completos.

## 6. Índices lógicos necesarios

Sin definir aún sintaxis SQL:

### Corredor

- único por `site_id + code`;
- único por `site_id + slug`;
- índice por `site_id + status`.

### Tramo

- único por `corridor_id + code`;
- único por `corridor_id + slug`;
- índice por `corridor_id + status + sort_order`.

### Tramo–lugar

- clave compuesta por `segment_id + place_id + relation_type`;
- índice por `place_id + relation_type`;
- índice por `segment_id + sort_order`.

### Perfil territorial

- único por `site_id + place_id`;
- único por `site_id + public_slug`;
- índice por `site_id + status + sort_order`;
- índice por `site_id + is_on_corridor + status`.

### Experiencia

- único por `site_id + code`;
- único por `site_id + slug`;
- índice por `site_id + status + sort_order`.

### Relaciones

- clave compuesta por IDs relacionados;
- índice inverso por contenido, lugar o tramo;
- índice por experiencia y orden.

### Auditoría

- índice por `site_id + entity_type + entity_id + created_at`;
- índice por actor y fecha.

## 7. Reglas de publicación mínima

### Corredor

- nombre, slug y resumen;
- extremos;
- distancia documentada;
- geometría válida;
- fuente y revisión.

### Tramo

- corredor;
- origen y destino;
- orden;
- geometría;
- fuente;
- al menos un lugar relacionado además de los extremos cuando corresponda.

### Perfil de localidad

- lugar activo;
- título, resumen y descripción propia;
- portada autorizada o diseño que funcione sin imagen;
- relación con al menos un tramo;
- fuente y fecha de revisión;
- SEO mínimo.

### Experiencia

- nombre, resumen y descripción;
- identidad visual accesible;
- fuente;
- al menos una relación publicada con contenido, lugar o tramo.

## 8. Integridad y claves foráneas

Antes del SQL se deberá ejecutar en desarrollo y producción:

```sql
SHOW CREATE TABLE tags_directory_sites;
SHOW CREATE TABLE tags_geo_places;
SHOW CREATE TABLE tags_ai_tourism_sources;
SHOW CREATE TABLE tags_ai_tourism_contents;
```

Hasta confirmar tipo, tamaño, signo y motor:

- `site_id`, `place_id`, `source_id` y `content_id` se diseñan como columnas indexadas;
- no se presupone una clave foránea hacia tablas preexistentes;
- la integridad se validará transaccionalmente en servidor;
- entre tablas creadas dentro de la misma migración podrán utilizarse FK únicamente cuando los tipos estén confirmados.

## 9. Eliminación y reversibilidad

- El flujo normal no eliminará entidades publicadas.
- Las relaciones podrán quitarse dejando auditoría.
- El borrado físico se reservará para borradores sin dependencias y requerirá confirmación.
- La migración futura será aditiva: no alterará tablas de CalamuchitAr ni datos existentes.
- El rollback eliminará solamente tablas nuevas y solo si no contienen datos que deban preservarse.
- La aplicación deberá tolerar que el esquema nuevo todavía no exista y mostrar el módulo como no configurado.

## 10. Alcance de la primera migración

La primera migración, cuando sea aprobada, debería incluir solamente:

1. corredores;
2. tramos;
3. tramo–lugar;
4. perfiles territoriales;
5. experiencias;
6. tres relaciones de experiencias;
7. auditoría territorial.

No incluirá:

- itinerarios;
- viajes de usuarios;
- pasaporte;
- clima;
- estado vial en tiempo real;
- nuevas tablas de atractivos, eventos, prestadores o imágenes.

## 11. Datos iniciales

La migración estructural no debería cargar automáticamente:

- localidades no verificadas;
- geometrías aproximadas;
- tramos inferidos;
- atractivos;
- prestadores;
- eventos.

Los únicos datos semilla candidatos son las diez experiencias oficiales, pero se recomienda cargarlas mediante un script separado y auditable después de crear el corredor y confirmar fuente, textos e identidad visual.

## 12. Siguiente ítem propuesto

Preparar la **migración SQL exacta, sin ejecutarla**, acompañada por:

- consultas `SHOW CREATE TABLE` requeridas;
- verificación de compatibilidad MariaDB 10.11;
- script de comprobación posterior;
- rollback condicionado;
- orden de ejecución en desarrollo y producción.

