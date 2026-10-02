# Muchi — Diseño técnico del conocimiento, búsqueda y recomendaciones

**Versión:** 1.0  
**Fecha:** 26 de septiembre de 2026  
**Estado:** diseño aprobado funcionalmente; pendiente de aprobación del modelo físico y del SQL  
**Alcance:** motor reutilizable para asistentes de directorios Tags. CalamuchitAr es la primera implementación.

## 1. Objetivo

Reemplazar la búsqueda actual basada principalmente en coincidencias `LIKE` y un contexto textual mezclado por un motor capaz de:

- entender si la persona busca un producto, servicio, prestador, lugar, evento, información práctica o itinerario;
- utilizar toda la información pública disponible en Tags, desde una ficha gratuita hasta Store, catálogo, Turnos, Resto y otros addons activos;
- encontrar productos y servicios mencionados expresamente dentro de descripciones aunque el prestador no tenga catálogo ni Store;
- distinguir una oferta confirmada de una alternativa inferida por rubro;
- aplicar ubicación, distancia, fecha, horarios, stock, disponibilidad y demás restricciones cuando existan datos fiables;
- producir respuestas breves, precisas y verificables, con tarjetas e imágenes construidas por el servidor;
- incorporar conocimiento turístico estructurado y generar itinerarios geográfica y temporalmente posibles;
- explicar por qué un resultado fue seleccionado y permitir auditarlo desde administración;
- evitar duplicar las fuentes de verdad de los módulos existentes.

## 2. Diagnóstico del sistema actual

El flujo efectivo actual es:

```text
mensaje e historial
  -> términos normalizados
  -> consulta SQL con LIKE sobre varias tablas
  -> hasta 6 prestadores
  -> contexto textual de hasta 16.000 caracteres
  -> respuesta libre del LLM
  -> tarjetas detectadas por los nombres escritos en la respuesta
```

Brechas principales:

1. No existe un objeto de intención y restricciones validado.
2. Se descartan candidatos demasiado temprano.
3. No se conserva qué campo produjo cada coincidencia.
4. Productos, servicios, descripciones y categorías terminan como texto sin una semántica común.
5. El orden comercial se aplica antes de contar con una puntuación completa de pertinencia.
6. No hay diferencia técnica suficiente entre coincidencia explícita, producto publicado e inferencia por rubro.
7. El modelo redacta y, de manera indirecta, decide qué tarjetas mostrar.
8. No existe un repositorio estructurado suficiente para atractivos, accesos al río, senderos, eventos e información turística editorial.
9. No existe un banco de evaluación que permita medir regresiones.

## 3. Principios de arquitectura

### 3.1 Fuentes originales y proyección de lectura

Store, Turnos, Resto, QR-Page, Directorio y futuros addons continúan siendo las fuentes de verdad. Muchi utilizará una **proyección de conocimiento público** reconstruible.

La proyección:

- no modifica la entidad original;
- no almacena información operativa privada;
- conserva procedencia, versión y fecha;
- puede eliminarse y regenerarse;
- contiene documentos separados por entidad pública, no un único texto por comercio.

### 3.2 Relevancia antes que prioridad comercial

Primero se determina elegibilidad y relevancia. La relación comercial solamente puede ordenar candidatos que resulten pertinentes. Nunca debe desplazar a la única respuesta exacta.

### 3.3 Ausencia de dato no significa respuesta negativa

- Sin stock publicado no significa agotado.
- Sin horario no significa cerrado.
- Sin Turnos no significa que no preste el servicio.
- Sin catálogo no significa que no venda un producto expresamente mencionado en su descripción.

### 3.4 Respuesta basada en evidencia

Toda afirmación comercial debe estar asociada con una evidencia pública y un nivel de confianza. La redacción no puede ampliar el alcance de esa evidencia.

## 4. Arquitectura objetivo

```text
Fuentes públicas de Tags
  -> adaptadores por módulo
  -> normalización y extracción de conceptos
  -> índice de conocimiento por canal
  -> interpretación de intención y contexto
  -> recuperación híbrida
  -> filtros obligatorios
  -> puntuación y reordenamiento
  -> paquete compacto de evidencias
  -> respuesta estructurada del LLM
  -> validación servidor
  -> texto, tarjetas, mapa y acciones
```

Componentes lógicos:

1. **Source adapters:** leen contratos públicos existentes.
2. **Knowledge projector:** crea documentos normalizados.
3. **Concept extractor:** extrae productos, servicios, marcas y especialidades desde texto libre.
4. **Knowledge index:** permite búsqueda léxica, estructurada, geográfica y semántica.
5. **Intent interpreter:** produce intención, entidades, filtros y datos faltantes.
6. **Retriever:** elige fuentes y recupera candidatos amplios.
7. **Ranker:** filtra, puntúa, explica y agrupa.
8. **Answer composer:** entrega al LLM solamente evidencia compacta.
9. **Response validator:** valida IDs, imágenes, enlaces, acciones y afirmaciones.
10. **Evaluation service:** registra métricas y ejecuta consultas de referencia.

## 5. Entidades del índice de conocimiento

Los nombres siguientes son contratos conceptuales. El SQL se definirá únicamente después de ejecutar y comparar `SHOW CREATE TABLE` en desarrollo y producción.

### 5.1 Documento de conocimiento

Entidad conceptual `tags_ai_knowledge_documents`:

| Campo lógico | Finalidad |
| --- | --- |
| `id` | Identificador interno estable |
| `site_id` | Canal/directorio al que pertenece |
| `business_id` | Prestador, si corresponde |
| `listing_id` | Ficha de directorio, si corresponde |
| `entity_type` | `business`, `location`, `product`, `service`, `menu_item`, `benefit`, `event`, `attraction`, `river_spot`, `trail`, `excursion`, `practical_info` |
| `source_type` | Tabla o adaptador de origen |
| `source_id` | Identificador original como texto para tolerar PK heterogéneas |
| `canonical_key` | Clave única de proyección, por ejemplo `store_product:531` |
| `title` | Nombre público |
| `summary` | Resumen público controlado |
| `searchable_text` | Texto limpio destinado a recuperación |
| `attributes_json` | Atributos normalizados propios del tipo |
| `commercial_json` | Precio, moneda, stock y modalidad cuando sean públicos |
| `location_json` | Localidad, dirección, coordenadas y área de servicio |
| `availability_json` | Estado consultable y marca temporal, sin datos privados |
| `actions_json` | Ver, llamar, WhatsApp, llegar, reservar o comprar |
| `primary_image_url` | Imagen principal autorizada |
| `images_json` | Galería pública autorizada y procedencia |
| `visibility` | Estado de exposición a Muchi |
| `source_updated_at` | Momento de actualización del origen |
| `indexed_at` | Momento de proyección |
| `source_hash` | Detección idempotente de cambios |
| `quality_score` | Completitud técnica, no relación comercial |
| `verification_status` | `automatic`, `business_confirmed`, `editor_confirmed`, `rejected`, `stale` |

Índices mínimos previstos:

- unicidad por `site_id + canonical_key`;
- búsqueda por `site_id + entity_type + visibility`;
- búsqueda por `business_id` y `listing_id`;
- búsqueda por estado y fecha de indexación;
- índice de texto completo si la versión efectiva de MySQL lo soporta correctamente;
- coordenadas aptas para cálculo geográfico;
- vector semántico en proveedor o mecanismo desacoplado, no como requisito para el primer despliegue.

### 5.2 Evidencias y conceptos extraídos

Entidad conceptual `tags_ai_knowledge_claims`:

| Campo lógico | Finalidad |
| --- | --- |
| `document_id` | Documento al que pertenece |
| `claim_type` | `product`, `service`, `brand`, `specialty`, `audience`, `delivery_area`, `feature`, `restriction` |
| `canonical_value` | Concepto normalizado, por ejemplo `control remoto` |
| `display_value` | Texto para interfaz |
| `qualifiers_json` | TV, audio, marca, medida u otras variantes |
| `evidence_kind` | `structured`, `explicit_text`, `editorial`, `category_inference` |
| `evidence_excerpt` | Fragmento corto que sustenta la extracción |
| `source_field` | `listing.description`, `store_product.title`, etc. |
| `confidence` | Confianza de extracción, separada de verificación |
| `status` | `detected`, `confirmed`, `rejected`, `expired` |
| `confirmed_by_type/id` | Prestador o administrador que confirmó |
| `reviewed_at` | Fecha de revisión |

Esta entidad permite que una frase como “controles remotos para TV y audio” produzca:

- concepto: `control remoto`;
- calificadores: `tv`, `audio`;
- evidencia: `explicit_text`;
- campo: descripción pública;
- estado inicial: `detected`;
- afirmación permitida: “informa que vende controles remotos para TV y audio”;
- afirmaciones prohibidas sin otros datos: precio, stock o modelo disponible.

### 5.3 Sinónimos y vocabulario

Entidad conceptual `tags_ai_concept_aliases`:

- concepto canónico;
- alias y errores frecuentes;
- tipo de concepto;
- ámbito global o por canal;
- idioma/región;
- estado y procedencia editorial.

Ejemplos: `televisor -> tv`, `smart tv -> tv`, `mando a distancia -> control remoto`, `cabaña -> alojamiento`.

No se utilizarán solamente diccionarios escritos en código como ocurre en el fallback actual.

### 5.4 Estado de sincronización

Entidad conceptual `tags_ai_index_jobs` o cola equivalente:

- canal, negocio, tipo y origen;
- operación `upsert`, `delete`, `rebuild_business`, `rebuild_site`;
- estado, intentos y próximo reintento;
- fecha de detección y procesamiento;
- último error;
- hash esperado.

Se debe reutilizar una infraestructura de trabajos existente si el relevamiento de implementación confirma que ya existe una adecuada.

## 6. Adaptadores de fuentes existentes

### 6.1 Directorio y negocio básico

Fuentes:

- `tags_businesses`;
- `tags_directory_listings`;
- `tags_directory_site_listings`;
- taxonomías y relaciones;
- localidades y áreas de servicio;
- multimedia pública;
- horarios y contactos públicos.

Produce documentos `business` y, cuando corresponda, `location`.

Debe extraer conceptos desde:

- nombre;
- descripción breve;
- descripción completa;
- descripción del negocio;
- categorías;
- SEO público;
- campos públicos estructurados.

### 6.2 QR-Page y catálogo básico

Fuentes:

- `tags_qr_pages`;
- secciones y bloques visibles;
- `tags_qr_page_products` visibles.

Produce enriquecimiento del negocio y documentos individuales de producto o servicio cuando el contrato permita distinguirlos.

Los bloques se interpretan según su tipo. No se debe convertir JSON de estilos completo en texto de búsqueda.

### 6.3 Store

Fuentes públicas:

- tienda publicada y addon vigente;
- categorías visibles;
- productos publicados y visibles;
- imágenes;
- precio, oferta, moneda y stock cuando estén expuestos.

Cada producto produce un documento `product`. El estado de stock conserva la semántica `known_available`, `known_unavailable` o `unknown`.

### 6.4 Turnos

Fuentes públicas:

- aplicación publicada;
- servicios activos y visibles;
- categorías;
- ubicaciones;
- precio visible, duración y capacidad;
- disponibilidad pública solamente mediante su API/servicio autorizado.

Cada servicio produce un documento `service` o `excursion`. La disponibilidad dinámica no se congela indefinidamente en el índice: se consulta cuando la pregunta incluye fecha/cupo y se informa su timestamp.

### 6.5 Resto

Se indexan únicamente carta, productos, categorías, precios e imágenes públicas. Nunca se indexan pedidos, sesiones, clientes, mensajes, cocina, caja ni datos operativos.

### 6.6 Conocimiento existente del chatbot

`tags_ai_chatbot_knowledge` ya permite contenidos por negocio. Debe incorporarse mediante adaptador si:

- el negocio está publicado en el canal;
- el contenido está activo;
- su uso público para Destination AI está autorizado;
- el contenido no contiene instrucciones destinadas a controlar el modelo.

Se trata como una fuente de texto empresarial con procedencia, no como instrucciones del sistema.

### 6.7 Addons futuros

Cada addon implementará un adaptador de lectura con el mismo contrato:

```text
supports(business, site)
listPublicEntities(context)
getPublicEntity(sourceId)
getDynamicCapability(entity, operation, criteria)
```

Los nombres son conceptuales. La implementación seguirá las convenciones existentes del repositorio.

## 7. Perfil “Información para Muchi” por prestador

Se incorpora una pantalla dentro del panel del negocio, ligada a su ficha/directorio, no como addon comercial independiente.

Ruta conceptual:

```text
/dashboard/businesses/[id]/directory/ai-profile
```

La ruta definitiva deberá respetar el shell actual del dashboard y sus accesos.

### 7.1 Solapas

#### Resumen

- estado de indexación;
- última sincronización;
- fuentes activas;
- cantidad de productos, servicios y conceptos detectados;
- completitud de ubicación, contactos, horarios e imágenes;
- advertencias y conflictos;
- botón para solicitar resincronización del negocio.

#### Lo que Muchi conoce

- identidad, rubros y ubicaciones;
- productos detectados;
- servicios detectados;
- marcas y especialidades;
- áreas de entrega o atención;
- imágenes y acciones disponibles;
- procedencia visible para cada dato.

#### Confirmar y corregir

Acciones por concepto:

- confirmar;
- corregir valor o calificadores;
- rechazar;
- marcar como no ofrecido actualmente;
- agregar sinónimos propios;
- completar información faltante.

Estas acciones crean metadatos o conocimiento complementario. No modifican silenciosamente Store, Turnos o la ficha original.

#### Información complementaria

Campos estructurados:

- productos y servicios no cargados en otros módulos;
- marcas;
- especialidades;
- público objetivo;
- zonas y radio de atención o entrega;
- modalidades de entrega y atención;
- medios de pago públicos;
- condiciones relevantes;
- preguntas frecuentes;
- exclusiones: “no realizamos reparaciones”, por ejemplo.

No se utilizará una única caja de texto como solución principal.

#### Probar en Muchi

Permite escribir una consulta y obtener un diagnóstico no público:

- intención detectada;
- filtros interpretados;
- posición del prestador;
- puntuación por componente;
- evidencia usada;
- restricciones cumplidas o faltantes;
- texto permitido para la recomendación;
- motivos por los que no fue seleccionado.

#### Historial

- confirmaciones y rechazos;
- cambios editoriales;
- sincronizaciones;
- errores;
- usuario y fecha.

### 7.2 Administración del directorio

El panel del directorio incorporará:

- monitor global de indexación;
- prestadores incompletos o con errores;
- conceptos pendientes de revisión;
- conflictos de fuente;
- reconstrucción controlada por prestador o canal;
- vocabulario y sinónimos;
- configuración de ponderaciones dentro de límites seguros;
- banco de consultas de evaluación;
- comparación entre motor vigente y motor nuevo;
- administración del conocimiento turístico.

## 8. Conocimiento turístico estructurado

### 8.1 Lugar de destino

Entidad conceptual `tags_destination_places`:

- canal/directorio;
- tipo: atractivo, acceso al río, balneario, sendero, mirador, museo, reserva, paseo, plaza u otro;
- nombre, resumen y descripción;
- localidad, dirección y coordenadas;
- duración sugerida;
- dificultad y exigencia;
- edades y público recomendado;
- accesibilidad y mascotas;
- costo y moneda;
- horarios y temporadas;
- acceso, camino y estacionamiento;
- instalaciones y servicios;
- clima adecuado o restricciones meteorológicas;
- advertencias y seguridad;
- imágenes autorizadas;
- URL/fuente, jurisdicción y fecha de verificación;
- estado editorial y vigencia.

### 8.2 Evento o festividad

Entidad conceptual `tags_destination_events`:

- canal y lugar relacionado;
- nombre, tipo y descripción;
- inicio, finalización, horarios y zona horaria;
- recurrencia;
- localidad y coordenadas;
- organizador y fuente oficial;
- costo o entradas;
- audiencia y accesibilidad;
- condiciones climáticas;
- imágenes;
- estado: borrador, publicado, suspendido, cancelado o finalizado;
- fecha de última verificación.

### 8.3 Relaciones

Entidad conceptual para relacionar:

- lugar con prestador;
- excursión con servicio de Turnos;
- evento con sede;
- atractivos cercanos;
- actividades complementarias;
- incompatibilidades o restricciones;
- alternativas por lluvia.

Las excursiones comerciales se vinculan con su prestador y servicio; no se duplican como contenido editorial independiente.

## 9. Interpretación de la consulta

Contrato lógico `SearchIntent`:

```json
{
  "intent": "find_product",
  "subject": "control remoto",
  "qualifiers": ["tv", "audio"],
  "place": "Los Reartes",
  "dateRange": null,
  "party": null,
  "mobility": "can_travel",
  "radiusKm": null,
  "budget": null,
  "hardConstraints": [],
  "softPreferences": [],
  "missingDecisiveFields": [],
  "requiresClarification": false
}
```

Intenciones iniciales:

- `find_product`;
- `find_service`;
- `find_business`;
- `find_food`;
- `find_accommodation`;
- `find_activity`;
- `find_attraction`;
- `find_event`;
- `plan_itinerary`;
- `destination_information`;
- `compare_options`;
- `follow_up`.

La extracción utilizará reglas deterministas para localidad, fechas, coordenadas y cantidades, y salida estructurada del modelo para lenguaje ambiguo. El servidor valida todos los valores.

Muchi pregunta solamente cuando falta un dato que cambiaría materialmente la recomendación. No debe interrogar innecesariamente.

## 10. Recuperación y ranking

### 10.1 Recuperación híbrida

Por intención se consultan únicamente las fuentes aplicables:

| Intención | Fuentes principales |
| --- | --- |
| Producto | productos estructurados, catálogo QR, conceptos explícitos de descripción |
| Servicio | Turnos, catálogo, conceptos explícitos, ficha |
| Prestador | ficha, negocio, página pública y ubicaciones |
| Gastronomía | Resto/Store público, ficha y carta |
| Atractivo/río/sendero | conocimiento turístico editorial |
| Evento | eventos vigentes |
| Itinerario | lugares, eventos, actividades, gastronomía y servicios elegibles |

Etapas:

1. Coincidencia exacta por concepto, alias y calificadores.
2. Búsqueda de texto completo.
3. Búsqueda semántica sobre descripciones y conocimiento largo.
4. Recuperación por taxonomía.
5. Expansión geográfica, si la movilidad lo permite.
6. Deduplificación canónica.

Se recuperan inicialmente 30–50 candidatos. Los filtros y ranking reducen luego el conjunto.

### 10.2 Filtros obligatorios

- canal y publicación activa;
- visibilidad pública y autorización para IA;
- vigencia temporal;
- localidad o radio cuando sean restricciones duras;
- fecha, capacidad, accesibilidad y otras condiciones indispensables;
- coordenadas válidas antes de calcular distancia;
- ausencia de contradicción explícita;
- políticas de seguridad y contenido.

### 10.3 Niveles de evidencia

| Nivel | Evidencia | Presentación permitida |
| --- | --- | --- |
| `structured_current` | Producto/servicio público estructurado y vigente | “Tiene publicado…” |
| `business_confirmed` | Concepto confirmado por el prestador | “El comercio informa que ofrece…” |
| `explicit_text` | Mención inequívoca en texto público | “En su información pública indica…” |
| `editor_confirmed` | Contenido validado por el directorio | “Información validada por…” |
| `category_inference` | Relación solamente por rubro | “Puede ser una alternativa para consultar…” |
| `semantic_only` | Similitud sin evidencia suficiente | No se recomienda como respuesta principal |

### 10.4 Puntuación inicial configurable

La fórmula exacta se calibrará con el banco de evaluación. Punto de partida:

```text
score =
  evidencia exacta                 0..40
  coincidencia de calificadores    0..15
  restricciones cumplidas          0..15
  relevancia semántica/léxica      0..10
  cercanía geográfica              0..10
  actualidad y completitud         0..5
  disponibilidad verificable       0..5
```

Después de asegurar un umbral mínimo de pertinencia puede aplicarse un desempate comercial limitado:

```text
abonado pertinente                 +0..3
destacado pertinente               +0..1
orden editorial                    desempate final
```

Un resultado `category_inference` no puede superar a uno `explicit_text` o estructurado solamente por condición comercial o distancia.

### 10.5 Distancia

- Se calcula únicamente con coordenadas válidas y ubicación consentida o lugar indicado.
- La primera versión puede usar distancia geodésica y debe rotularla como aproximada.
- La distancia por ruta requiere proveedor de mapas aprobado.
- Resultados sin coordenadas pueden mostrarse después, sin distancia inventada.
- Cuando el usuario acepta moverse, la expansión se realiza por radios progresivos y no por una lista rígida de localidades.

## 11. Generación y validación de respuesta

El LLM recibe un paquete de evidencias pequeño y tipado, nunca filas crudas ni JSON de estilos.

Contrato conceptual `AssistantResponse`:

```json
{
  "reply": "La opción más directa es...",
  "clarifyingQuestion": null,
  "recommendations": [
    {
      "entityKey": "business:42",
      "reasonCode": "EXPLICIT_PRODUCT_MENTION",
      "evidenceIds": [701],
      "presentation": "primary"
    }
  ],
  "assumptions": [],
  "notices": []
}
```

El servidor:

- comprueba que cada entidad estaba en el conjunto autorizado;
- valida que las evidencias existan;
- arma imagen, distancia, precio y acciones desde datos reales;
- elimina acciones sin URL o permiso;
- impide que una inferencia se presente como disponibilidad;
- limita cantidad de tarjetas según intención;
- registra IDs y razones para evaluación.

## 12. Itinerarios

### 12.1 Datos mínimos

- día o rango de fechas;
- origen;
- vehículo/movilidad;
- cantidad y edades relevantes;
- intereses;
- ritmo;
- restricciones;
- clima observado o escenario indicado;
- presupuesto cuando sea decisivo.

### 12.2 Planificación

1. Obtener lugares, eventos y servicios elegibles.
2. Aplicar horarios, vigencia, temporada y clima.
3. Estimar duración y desplazamiento.
4. Agrupar geográficamente.
5. Respetar ventanas horarias y evitar superposiciones.
6. Incorporar pausas y comidas razonables.
7. Preparar alternativas por lluvia o indisponibilidad.
8. Validar que el itinerario sea posible antes de redactarlo.

La salida contiene bloques de mañana, mediodía, tarde y noche, tramos, tiempos aproximados, imágenes principales y acciones. Las suposiciones quedan explícitas.

## 13. APIs previstas

Las rutas definitivas deberán validar la autenticación y convenciones existentes.

### Prestador

- `GET /api/destination-ai/business/profile?businessId=...`
- `POST /api/destination-ai/business/profile/supplemental`
- `POST /api/destination-ai/business/claims/[claimId]/confirm`
- `POST /api/destination-ai/business/claims/[claimId]/reject`
- `POST /api/destination-ai/business/reindex`
- `POST /api/destination-ai/business/test-query`
- `GET /api/destination-ai/business/history`

### Administración del directorio

- `GET /api/directory/admin/destination-ai/index-status`
- `POST /api/directory/admin/destination-ai/reindex`
- `GET/POST /api/directory/admin/destination-ai/concepts`
- `GET/POST /api/directory/admin/destination-ai/evaluations`
- `POST /api/directory/admin/destination-ai/compare`
- CRUD de lugares, eventos, relaciones y fuentes editoriales.

### Chat público

El endpoint actual conservará compatibilidad externa, pero internamente utilizará el nuevo orquestador. La respuesta puede mantener temporalmente campos actuales y añadir el contrato estructurado para una migración gradual del frontend.

## 14. Permisos

Permisos conceptuales:

- `destination_ai.profile.view`;
- `destination_ai.profile.manage`;
- `destination_ai.claims.review`;
- `destination_ai.reindex`;
- `destination_ai.test`;
- `destination_ai.directory.monitor`;
- `destination_ai.knowledge.manage`;
- `destination_ai.events.manage`;
- `destination_ai.evaluations.manage`;
- `destination_ai.audit.view`.

Antes de crear permisos se verificará si el dashboard central ya ofrece equivalentes reutilizables.

## 15. Backfill de prestadores existentes

### 15.1 Objetivo

Incorporar todos los prestadores publicados sin exigir recarga manual.

### 15.2 Secuencia

1. Crear tablas de proyección vacías.
2. Ejecutar auditoría de fuentes por canal.
3. Procesar una muestra representativa de 10–20 prestadores.
4. Generar documentos y conceptos en estado de prueba.
5. Revisar productos, servicios, ubicación, imágenes y acciones.
6. Ajustar extractores y vocabulario.
7. Procesar el resto por lotes idempotentes.
8. Ejecutar validaciones de conteo y cobertura.
9. Abrir revisión de conceptos dudosos en administración.
10. Mantener el motor nuevo en modo sombra.
11. Comparar ambos motores con consultas reales.
12. Activar el nuevo motor por canal mediante configuración reversible.

### 15.3 Idempotencia y reanudación

- El `canonical_key` y `source_hash` evitan duplicados.
- Cada lote registra cursor, totales y errores.
- Un error de un prestador no interrumpe el canal completo.
- El proceso puede reanudarse.
- La proyección anterior de una entidad se conserva hasta completar su reemplazo transaccional.
- Una fuente eliminada o despublicada genera una operación de baja lógica inmediata.

### 15.4 Validaciones del backfill

- prestadores publicados vs. documentos `business`;
- productos públicos por módulo vs. documentos de producto;
- servicios públicos vs. documentos de servicio;
- conceptos extraídos por prestador;
- coordenadas inválidas;
- URLs e imágenes vacías;
- documentos huérfanos;
- duplicados canónicos;
- datos privados filtrados;
- errores y duración por lote.

## 16. Sincronización incremental

Prioridad de implementación:

1. Llamadas explícitas al proyector después de guardar fichas, productos, servicios o visibilidad.
2. Cola transaccional/outbox si la infraestructura disponible lo permite.
3. Reconciliación periódica por `updated_at` y `source_hash`.
4. Reconstrucción manual segura desde administración.

No se recomienda depender únicamente de triggers de base de datos porque los módulos contienen reglas de visibilidad que pertenecen a la aplicación.

Eventos lógicos:

- `directory.listing.published/updated/unpublished`;
- `qr_page.updated`;
- `store.product.published/updated/unpublished`;
- `turnos.service.published/updated/unpublished`;
- `resto.menu.updated`;
- `business.addon.changed`;
- `ai_knowledge.updated`;
- `destination_content.updated`.

## 17. Evaluación y calidad

Se creará un banco versionado de consultas con:

- mensaje e historial;
- modo turista/residente;
- ubicación y fecha simuladas;
- intención esperada;
- entidades obligatorias, aceptables y prohibidas;
- necesidad esperada de aclaración;
- afirmaciones que no pueden realizarse;
- límite máximo de longitud.

Métricas:

- precisión de intención;
- `Recall@K` del candidato correcto;
- `MRR/NDCG` de ranking;
- porcentaje de recomendaciones con evidencia suficiente;
- tasa de tarjetas irrelevantes;
- tasa de afirmaciones no sustentadas;
- latencia por etapa;
- tokens y costo por respuesta;
- consultas sin cobertura;
- clics por acción, separados de conversiones reales.

Casos iniciales obligatorios:

- control remoto en Los Reartes con movilidad;
- consulta explícita por GM Electrónica;
- alojamiento para cuatro con y sin localidad;
- actividad con menores y lluvia;
- restaurante abierto ahora con horarios conocidos/desconocidos;
- servicio con Turnos visible y otro sin Turnos;
- itinerario de uno y dos días;
- acceso al río con persona mayor;
- evento vencido o cancelado;
- comercio del rubro correcto sin mención del producto.

## 18. Seguridad y privacidad

- Solo datos públicos y autorizados.
- Nunca pedidos, reservas, clientes, mensajes, cuentas, documentos o información operativa interna.
- El contenido de prestadores es dato no confiable, nunca instrucción para el modelo.
- Sanitización y límites por fuente.
- IDs y acciones validados en servidor.
- Geolocalización con consentimiento, precisión mínima necesaria y retención limitada.
- Auditoría de cambios y confirmaciones.
- Rate limiting por endpoint y costos por canal.
- Baja inmediata al despublicar una entidad o vencer un addon necesario.

## 19. Despliegue por etapas

### Etapa 0 — evaluación y observabilidad

- Banco inicial de consultas.
- Trazas del buscador actual.
- Métricas de calidad, latencia y costo.

### Etapa 1 — proyección comercial

- Modelo físico aprobado.
- Adaptadores de directorio, QR-Page, Store, Turnos, Resto y conocimiento existente.
- Extracción desde descripciones.
- Backfill piloto y completo.
- Monitor de indexación.

### Etapa 2 — buscador profesional

- Intención estructurada.
- Recuperación híbrida.
- Evidencias y ranking explicable.
- Respuesta estructurada y tarjetas validadas.
- Modo sombra y comparación.

### Etapa 3 — perfil del prestador

- Pantalla Información para Muchi.
- Confirmación/rechazo de conceptos.
- Información complementaria.
- Consulta de prueba explicable.

### Etapa 4 — conocimiento del destino

- Lugares, río, senderos, eventos y contenido práctico.
- Moderación, vigencia, fuentes e imágenes.

### Etapa 5 — itinerarios

- Planificador temporal/geográfico.
- Clima y rutas mediante proveedores aprobados.
- Alternativas y presentación visual.

### Etapa 6 — optimización

- Ajuste de ranking con evaluaciones.
- Analítica de cobertura y búsquedas no resueltas.
- Caching, embeddings y costos.

## 20. Criterios de aceptación del primer hito funcional

1. GM Electrónica aparece antes que alternativas inferidas para una consulta de controles remotos cuando la mención existe en su descripción.
2. Una alternativa por rubro queda rotulada como “consultar”, no como vendedora confirmada.
3. Un producto de Store y un servicio de Turnos se recuperan como entidades independientes con imagen, precio y acción cuando sean públicos.
4. La búsqueda funciona también para un prestador sin addons mediante su ficha y descripción.
5. La distancia se muestra solo con coordenadas válidas.
6. Ninguna tarjeta se selecciona buscando nombres dentro del texto generado.
7. Cada recomendación puede explicar su evidencia y puntuación.
8. Despublicar una fuente la retira del índice en el tiempo comprometido.
9. El backfill es repetible y no duplica documentos.
10. El endpoint conserva compatibilidad durante el despliegue gradual.

## 21. Decisiones pendientes antes del SQL

1. Obtener `SHOW CREATE TABLE` de desarrollo y producción para todas las fuentes legacy involucradas.
2. Confirmar versión y capacidades reales de MySQL para texto completo y JSON.
3. Seleccionar almacenamiento semántico: proveedor externo, capacidad disponible o fase posterior.
4. Confirmar infraestructura de trabajos programados/colas reutilizable.
5. Definir proveedor de clima y de tiempos por ruta.
6. Definir retención de consultas, ubicación y trazas.
7. Aprobar las ponderaciones comerciales máximas.
8. Designar responsable editorial del conocimiento turístico.

## 22. Artefactos siguientes

Después de aprobar este diseño físico-funcional:

1. Matriz de fuentes y campos exactos verificados.
2. Migración SQL idempotente para desarrollo, sin FKs hacia tablas legacy no verificadas.
3. Script de backfill en modo `dry-run` y ejecución por lotes.
4. Contratos JavaScript del índice, intención, candidato y respuesta.
5. Implementación de Etapa 0 y Etapa 1.
6. Reporte de resultados del piloto antes de habilitar Muchi nuevo en producción.
