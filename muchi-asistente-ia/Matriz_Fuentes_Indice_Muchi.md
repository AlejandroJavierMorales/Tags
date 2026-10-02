# Muchi — Matriz de fuentes del índice

**Verificación realizada:** base de desarrollo `calamuchitar`, MySQL 8.0.37, 26 de septiembre de 2026.  
**Producción:** pendiente de ejecutar `node scripts/destination-ai/audit-schema.mjs` contra su configuración antes de aplicar SQL.

| Documento | Fuente | Condición pública | Campos principales | Evidencia |
| --- | --- | --- | --- | --- |
| `business` | `tags_directory_listings`, `tags_directory_site_listings`, `tags_businesses` | ficha y canal publicados | nombre, descripciones, SEO, contacto, horarios, coordenadas | texto explícito o categoría |
| `business` enriquecido | `tags_qr_pages`, secciones y bloques | página, secciones y bloques publicados/visibles | título, descripción, SEO y contenido público limpio | texto explícito |
| `product` | `tags_qr_page_products` | producto visible y página publicada | título, descripción, categoría, precio, imagen, botón | estructurada |
| `product/menu_item` | `tags_store_products`, `tags_stores` | tienda y producto publicados/visibles | título, descripción, categoría, precio, oferta, stock, imagen | estructurada |
| `service/excursion` | `tags_turnos_services`, `tags_turnos_apps` | app publicada y servicio activo/visible | nombre, descripción, categoría, precio visible, duración, capacidad, imagen | estructurada |
| `business_knowledge` | `tags_ai_chatbot_knowledge` | contenido activo y negocio publicado | título, temas y contenido | texto explícito autorizado |
| ubicación | listing/business/Turnos locations | coordenadas válidas | localidad, dirección, latitud, longitud, área de servicio | estructurada |
| imágenes | directorio, QR, Store, Turnos | recurso público | URL, tipo y orden | fuente original |

## Reglas de proyección

- Una ficha produce un documento por canal, porque visibilidad, slug y relación comercial pueden variar.
- Un producto o servicio produce un documento propio y conserva `business_id` y `listing_id`.
- Descripciones completas forman parte de `searchable_text`; no requieren Store para participar de una búsqueda exacta.
- Una coincidencia dentro de descripción se presenta como mención explícita, no como stock o disponibilidad.
- Productos y servicios estructurados generan un `claim` con evidencia `structured`.
- Las inferencias por categoría nunca se convierten automáticamente en oferta confirmada.
- La proyección excluye pedidos, clientes, reservas, mensajes, caja y cualquier dato privado.
- Cada documento guarda `source_hash`; repetir el backfill no duplica información.

## Diferencias de tipos verificadas

- `tags_businesses.id`: `INT` con signo.
- `tags_business_addons.business_id`: `INT UNSIGNED`.
- `tags_directory_listings.business_id`: `BIGINT` con signo.
- `tags_directory_sites.id`: `BIGINT UNSIGNED`.
- Store utiliza IDs `INT`.
- Turnos utiliza principalmente `BIGINT UNSIGNED`.

Por estas diferencias, el índice utiliza identificadores amplios y no declara claves foráneas contra tablas legacy. La integridad se controla mediante el proyector y claves canónicas.

## Comprobación requerida en producción

Antes de ejecutar la migración:

```powershell
node scripts/destination-ai/audit-schema.mjs
```

El reporte no contiene contraseñas. Deben compararse tipos, columnas faltantes y versión de MySQL con esta matriz.
