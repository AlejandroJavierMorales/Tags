# Auditoría técnica del motor de IA de Muchi v2

Fecha: 2026-09-27

## Resultado ejecutivo

El motor actual no puede alcanzar la precisión requerida sólo ajustando palabras o puntajes. Su recuperación principal parte de un índice documental y luego intenta deducir el tipo de prestador desde nombres, descripciones y expresiones regulares. Eso mezcla dos decisiones que deben permanecer separadas:

1. **Elegibilidad:** qué entidades pertenecen realmente al rubro, producto, servicio o contenido solicitado.
2. **Relevancia:** cuál de las entidades elegibles conviene mostrar primero por evidencia, localidad, distancia, calidad y disponibilidad.

La reconstrucción v2 conserva el índice documental como evidencia complementaria, pero deja de utilizarlo como autoridad para habilitar candidatos.

## Fuentes reales verificadas

| Necesidad | Fuente existente | Uso en v2 |
| --- | --- | --- |
| Canal/directorio | `tags_directory_sites`, `tags_directory_site_listings` | Filtro obligatorio de publicación |
| Prestador/ficha | `tags_directory_listings`, `tags_businesses` | Identidad y datos públicos |
| Rubros | `tags_directory_taxonomy_nodes`, `tags_directory_taxonomy_closure`, `tags_directory_listing_taxonomy` | Elegibilidad estructural |
| Localidades | `tags_geo_places`, `tags_directory_listing_places` | Localidad y área de servicio |
| Coordenadas | ficha/directorio y negocio | Distancia y mapa, sólo con valores válidos |
| Productos básicos | `tags_qr_page_products` | Ítems publicados |
| Tienda | `tags_stores`, `tags_store_products`, categorías e imágenes | Productos estructurados |
| Gastronomía | Store con `app_type='resto'` | Platos/ítems de menú |
| Servicios reservables | `tags_turnos_apps`, `tags_turnos_services` | Servicios estructurados |
| Conocimiento del negocio | `tags_ai_chatbot_knowledge` | Evidencia editorial; no asigna rubro |
| Índice documental anterior | `tags_ai_knowledge_documents`, `tags_ai_knowledge_claims` | Evidencia y compatibilidad; no decide elegibilidad |

## Hallazgos

- La publicación por canal ya está correctamente modelada y debe comprobarse antes de cualquier búsqueda.
- La taxonomía es jerárquica y tiene tabla de cierre; permite buscar cualquier rubro sin codificar listas de palabras en JavaScript.
- Una ficha representa hoy una ubicación pública por negocio. El modelo admite una proyección de `business_location`, pero múltiples sucursales necesitarán una evolución del directorio de origen.
- Existen asociaciones históricas de rubros incorrectas o demasiado amplias. Deben poder confirmarse o rechazarse sin alterar a ciegas los datos legacy.
- Productos, platos y servicios poseen fuentes estructuradas diferentes y no deben mezclarse como texto genérico.
- La información turística institucional no tiene todavía una entidad estructurada, flujo editorial ni importación versionada.
- El modo turista/residente hoy influye en heurísticas de perfiles. En v2 será una preferencia de orden y presentación, nunca un filtro que suprima resultados válidos.
- El estado conversacional actual guarda una consulta principal y recomendaciones; no representa varias tareas activas. Esto explica las pérdidas de contexto al cambiar de producto o construir un itinerario.

## Arquitectura aprobada para implementar

La consulta se procesa en este orden inalterable:

1. Interpretar una o más tareas tipadas y resolver los rubros solicitados contra la taxonomía del canal.
2. Aplicar publicación, visibilidad, tipo de entidad, rubro y localidad como filtros estructurales.
3. Buscar texto únicamente dentro del conjunto elegible.
4. Ordenar por evidencia explícita, coincidencia, localidad solicitada, distancia, calidad y preferencia de modo.
5. Entregar al modelo de lenguaje sólo candidatos autorizados y sus evidencias.
6. Renderizar únicamente las tarjetas cuyos identificadores fueron devueltos por el modelo.

No habrá diccionarios de rubros como `pizza`, `ferretería` o `alojamiento` en el código del motor. Los sinónimos pertenecen a la taxonomía administrable y el intérprete recibe el catálogo real del canal.

## Transición

- La migración v2 es aditiva y no borra el índice v1.
- El backfill v2 dispone de `dry-run` y aplicación confirmada por nombre de base.
- El motor puede ejecutarse en `shadow` para comparar resultados sin mostrarlos.
- La activación pública requiere migración, backfill y casos críticos aprobados.
- Las asociaciones históricas quedan con estado `declared`; administración puede confirmarlas o rechazarlas. Una asociación rechazada nunca habilita un candidato.

## Limitaciones explícitas

- Clima, tránsito y estado de caminos requieren proveedores externos configurados; no se inventarán datos actuales.
- El cálculo inicial de distancia es geodésico. El tiempo real de viaje requiere un proveedor de rutas.
- La cobertura turística será tan completa como el contenido institucional cargado y publicado.
- La precisión de rubros heredados depende de su revisión editorial. El panel debe mostrar pendientes y errores de cobertura.
