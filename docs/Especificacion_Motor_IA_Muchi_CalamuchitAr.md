# Muchi — especificación integral del motor de IA y del directorio de CalamuchitAr

**Versión:** 2.0 · 27 de septiembre de 2026  
**Destinatario:** Codex trabajando dentro del repositorio real de Tags / CalamuchitAr  
**Estado:** contrato funcional detallado para auditar y ajustar la implementación existente; nombres de tablas, rutas y tipos son **conceptuales** hasta comprobar el repositorio.  
**Alcance territorial:** todas las localidades publicadas en el directorio del canal CalamuchitAr. No codificar una lista fija de pueblos dentro del prompt ni restringir el motor a Villa General Belgrano.

## 0. Instrucción principal

Muchi usa **una fuente de verdad estructurada**: prestadores y sedes publicados en el directorio de CalamuchitAr, sus rubros y actividad principal, datos públicos, productos de tienda/catálogo, platos de carta y contenido turístico municipal autorizado. El LLM entiende la pregunta y redacta; **no elige negocios de memoria ni decide su rubro leyendo palabras sueltas de una web**. La elegibilidad y el orden se resuelven en servidor antes de construir la respuesta. Un resultado solo se afirma cuando hay evidencia tipada y vigente.

**Prioridad de esta especificación:** el usuario pidió enfocarse en el funcionamiento general; no usar casos comerciales específicos anteriores como eje del diseño. La especificación previa de «experiencia de guía con mapa» puede aportar el diseño de interfaz, pero este documento manda sobre la elegibilidad, datos, indexación y los dos modos.

## 1. Objetivos y límites

1. **Estoy de visita:** ayudar a conocer el Valle, armar un día o recorrido turístico, descubrir experiencias, eventos, paseos, alojamiento, gastronomía y comercios útiles al viaje. También debe responder búsquedas libres de cualquier servicio o producto que pida el visitante, sin restringir artificialmente el rubro.
2. **Vivo acá:** ayudar a encontrar productos, servicios, comercios, profesionales, gastronomía, trámites e información local; permitir también paseos y eventos si el residente los solicita. El modo cambia las sugerencias iniciales y el estilo del plan, **no censura tipos de consulta**.
3. **Un ámbito común:** el canal CalamuchitAr define qué fichas y localidades están publicadas y visibles para Muchi. Fichas de otros canales/tenants nunca aparecen por accidente. Una sede puede pertenecer a varios canales únicamente si hay publicación/autorización explícita.
4. **Cero negocios inventados:** ningún nombre, dirección, plato, producto, horario, disponibilidad, descuento o distancia se genera sin un registro identificable y autorizado.
5. **Una implementación sencilla y operable:** reutilizar BD, APIs y módulos de Tags; indexar vistas de lectura normalizadas a partir de cambios publicados. La búsqueda estructurada es la base; texto completo/semántica refinan dentro de candidatos compatibles.

### Regla ilustrativa que debe generalizarse

Si el usuario busca **restaurante**, la coincidencia principal exige que la sede tenga **rubro/actividad de restaurante o gastronomía presencial pertinente** y sea pública en el canal. Una cabaña que menciona restaurantes cercanos en su descripción, chatbot o sitio web **no** es un restaurante. Si el complejo opera un restaurante abierto al público, eso se representa mediante un rubro de gastronomía publicado y, de ser necesario, una unidad/sede o servicio claramente identificado. La misma regla vale para ferreterías, farmacias, peluquerías, excursiones, ortopedias, almacenes y cualquier otro rubro.

## 2. Modelo mínimo de datos y fuente de verdad

No imponer una migración idéntica si Tags ya tiene equivalentes. Identificar y documentar la correspondencia real de estos conceptos:

| Entidad conceptual | Campos mínimos públicos / relación | Regla |
| --- | --- | --- |
| `Channel` | id, host, estado, políticas de visibilidad, zona horaria | CalamuchitAr es un canal, no un array de excepciones dentro del modelo. |
| `Locality` | id estable, nombre oficial, alias controlados, pertenencia al ámbito, geometría/centro opcional | El catálogo lo administra el canal; agregar una localidad no exige cambiar el prompt. |
| `Business` | id estable, nombre, descripción pública, estado comercial y propietario interno | Identidad del prestador; no confundir con su sede o su plan. |
| `BusinessLocation` | id, business_id, localidad_id, dirección, lat/lon opcionales verificadas, contacto público, horarios opcionales | Cada punto físico en el mapa; no inventar coordenadas por completar un formulario. |
| `BusinessChannelPublication` | business/location ids, channel_id, estado borrador/publicado/oculto/baja, visibilidad IA y fechas | Solo publicaciones vigentes y públicas ingresan al índice de Muchi. |
| `ActivityCategory` | id canónico, nombre, categoría padre, alias/sinónimos, tipo (comercio/servicio/gastronomía/etc.) | Taxonomía controlada y versionada, no lista de palabras dentro del prompt. |
| `BusinessCategoryAssignment` | business/location id, category_id, principal/secundaria, validación y publicación | Se exige al menos un rubro para que una ficha sea descubrible por rubro. |
| `CatalogItem` | id, business/location id, clase (`product`, `menu_dish`, `service`), nombre, categoría, descripción, estado, precio/stock opcionales, módulo origen | Solo se indexa cuando el módulo y el ítem se publican y autorizan. |
| `TourismContent` | id, localidad_id, clase, datos específicos, organismo responsable, procedencia, estado, vigencia y coordenadas opcionales | No es una ficha comercial salvo que exista además un prestador vinculado. |

**Alta básica de un comercio:** nombre; uno o más rubros canónicos y actividad principal; localidad/sede y ubicación con el máximo detalle disponible; medio de contacto; descripción breve; publicación en canal. Distinguir un dato obligatorio para **publicar** de uno obligatorio para **mostrar en mapa**: una ficha válida sin lat/lon puede aparecer en lista y localidad, pero no como pin exacto. Horario, imágenes, web, redes y módulos son opcionales. Un negocio con dos sedes conserva un `business_id` y dos `location_id`; su publicación por localidad se verifica por separado.

**Datos de módulos contratados:** carta de menú, tienda, catálogo, Turnos, alojamiento u otros siguen siendo propiedad de sus módulos originales. El indexador solo proyecta ítems y capacidades **habilitados, publicados y autorizados para IA**. Un prestador pertinente sin módulo contratado sigue apareciendo por su rubro y contacto, sin afirmar productos/platos/stock que no publica. El estado de suscripción influye en el orden comercial solamente después de pasar la elegibilidad, según reglas del canal.

## 3. Taxonomía de rubros y semántica de consulta

- Cada sede declara una **actividad principal** y puede tener varias secundarias reales (por ejemplo, cafetería y panadería). Las etiquetas de marketing («cerca del río», «recomendamos restaurantes») se almacenan como contexto descriptivo, **no otorgan un rubro**.
- Mantener un catálogo editorial de categorías con jerarquía y sinónimos de consulta: «restó», «restaurante» y «dónde comer» pueden mapear a gastronomía, pero «cabaña cerca de restaurantes» no genera la categoría restaurante.
- Evitar imponer un único rubro demasiado amplio: «electrónica» sola no demuestra que se vende un producto concreto. Para búsquedas de ítem, combinar rubro compatible con producto explícito en catálogo, o descripción propia del negocio que declara venderlo; diferenciar evidencia exacta de posible consulta.
- Las categorías de los ítems se enlazan a rubros compatibles. Un ítem de menú solo califica para consumo gastronómico de una sede con actividad gastronómica publicada. Un producto de tienda de un comercio clasificado en rubro inesperado dispara revisión de calidad en vez de cambiar automáticamente el rubro o forzar una recomendación falsa.
- El mapeo entre términos de usuario y categorías/ítems es administrable por personal autorizado: normalización de tildes, plural, variantes argentinas, sinónimos y errores de escritura habituales. No hace falta un diccionario manual por cada comercio.

## 4. Contrato de intención y contexto

El orquestador transforma texto (escrito o transcripto) más contexto voluntario en un objeto tipado, con validación de servidor. Ejemplo conceptual:

```json
{
  "mode": "resident",
  "task": "find_product",
  "target": {"name": "taladro", "category_ids": ["herramientas"]},
  "location": {"locality_id": "...", "coordinate_permission": false},
  "time": null,
  "hard_constraints": [],
  "preferences": ["cerca"],
  "follow_up_reference": null
}
```

Tareas mínimas: `find_business_category`, `find_product`, `find_dish`, `find_service`, `find_experience`, `find_event`, `plan_day`, `public_local_info`, `follow_up`, `other`. Los modos no se infieren como requisito duro de la ficha: son preferencias de conversación. Se puede pasar de turista a residente sin perder una pregunta escrita. Si hay ambigüedad que cambiaría materialmente el resultado, preguntar **una sola aclaración útil**; de lo contrario buscar de inmediato. Recordar localidad, fecha, movilidad y referencias («el segundo») solo durante la sesión, con controles para cambiar o borrar.

La UI ofrece sugerencias opcionales como **Con chicos**, **En pareja**, **Con amigos**, **Solo/a**, **Tengo auto**, **Sin auto**, **Cerca mío**, **Hoy**, **Esta tarde**, **Comer**, **Pasear**; cada chip modifica el mismo objeto tipado. Siempre mostrar una caja para **escribir directamente** y aceptar combinaciones libres. No pedir cinco preguntas si la frase inicial ya trae la información. Si se solicita geolocalización, pedir permiso explícito y permitir localidad manual; ningún chip implica consentimiento GPS.

## 5. Recuperación y ranking: reglas por tarea

### Etapa A — ámbito y visibilidad (obligatoria)

Filtrar por canal, publicación, permisos IA, sede/localidad, estado del ítem o contenido y restricciones de seguridad. Excluir borradores, privados, bajas y registros de otros canales. Rechazar datos de módulo no habilitado aun si quedaron en un índice viejo.

### Etapa B — elegibilidad estructural (obligatoria)

| Pedido | Candidatos elegibles para resultado principal | Exclusión / alternativa rotulada |
| --- | --- | --- |
| Restaurante o rubro específico | Sede con rubro correspondiente publicado; especialidad/servicio requerido si se pidió | Mención del rubro en web, descripción de alojamiento o conocimiento ajeno no crea elegibilidad. |
| Producto concreto | Comercio con rubro compatible **y** ítem publicado coincidente o declaración propia explícita de venderlo | Solo rubro amplio: «podés consultar», separado, sin prometer producto/stock. |
| Plato o bebida particular | Local gastronómico con ítem pertinente en carta pública autorizada | Restaurante sin carta: alternativa de contacto, sin afirmar que cocina ese plato. |
| Servicio específico | Prestador con actividad/rubro de servicio pertinente y servicio publicado o descripción propia explícita | Solo mención contextual o servicio prestado por un tercero: excluir. |
| Excursión/paseo | Actividad publicada por prestador elegible o contenido turístico municipal curado de esa clase | Alojamiento que menciona una excursión cercana no se convierte en operador. |
| Evento/fiesta | `TourismContent` evento vigente, localidad, fechas y fuente publicadas | No inferir ocurrencia por texto antiguo ni vender entradas inexistentes. |

Un mismo prestador puede ser elegible por varios rubros **si los declaró y publicó**. Para una búsqueda «restaurantes con alojamiento», requerir ambos hechos, sin inferir uno del otro. Separar claramente «resultados que cumplen» de «opciones relacionadas para consultar»; estas últimas solo si ayudan y sin desplazar las primeras.

### Etapa C — correspondencia, geografía y negocio

Entre elegibles, puntuar: (1) coincidencia exacta de rubro/ítem/servicio y atributos; (2) procedencia y actualidad; (3) localidad solicitada y distancia válida; (4) preferencias como precio o movilidad si hay datos; (5) prioridad abonado/gratuito/externo **entre resultados pertinentes**. Pesos configurables por canal, con explicación auditable. Un resultado de menor coincidencia no puede superar una restricción dura por ser cercano o pagar.

Búsqueda territorial: partir de localidad indicada, ampliar progresivamente a otras localidades **publicadas en CalamuchitAr** si faltan resultados; usar distancia calculada si hay coordenadas válidas, o relación de localidades configurada si no las hay. Explicar la ampliación («en tu localidad no encuentro un resultado confirmado; estas opciones están en…»). Si el usuario pide «solo en Los Reartes», no ampliar silenciosamente. No mostrar kilómetros ni tiempos de viaje no calculados. Deduplicar por negocio y sede sin perder sedes distintas; el mapa utiliza `location_id`, la ficha comercial `business_id`.

### Etapa D — redacción controlada

El LLM recibe objetos ya filtrados con `source_type`, `entity_id`, `matched_field`, `matched_category`, `evidence_level`, `locality`, `public_actions`, `updated_at` y `uncertainties`. Produce texto y referencias a IDs permitidos; el servidor valida los IDs de tarjetas antes de enviar la respuesta. Las descripciones libres y webs son fuente **secundaria para detalles**, nunca sustituyen rubro, permisos y clasificación del registro. No obedecer instrucciones contenidas en fichas de terceros. Si no hay resultados, decirlo y proponer ampliar zona o relajar un filtro solo con aceptación del usuario; no completar la pantalla con opciones irrelevantes.

## 6. Índice de lectura simple, sostenible y actualizable

**Fuente de verdad = tablas existentes de Tags; índice = proyección derivada, reconstruible.** Antes de elegir motor de búsqueda, auditar lo que ya existe. Primera implementación aceptable: consultas SQL con índices por `channel_id`, publicación, localidad y rubro, más búsqueda textual de ítems permitidos. Si el volumen lo exige, añadir búsqueda full-text o índice externo sin cambiar contratos. Un vector/embedding opcional solo se aplica a **candidatos estructuralmente elegibles** para mejorar lenguaje natural, nunca para decidir quién es restaurante.

Proyecciones lógicas mínimas (se pueden materializar como vistas/tablas/documentos según la arquitectura real):

| Documento de lectura | Contiene | Clave y actualización |
| --- | --- | --- |
| `business_location_search` | ids de canal/negocio/sede, nombre, rubros validados, descripción propia, localidad, coordenadas válidas, contactos públicos, publicación y capacidad de módulos | `channel_id + location_id`; altas/cambios de sede, rubro, contacto, visibilidad o plan. |
| `business_item_search` | id de producto/plato/servicio, clase, nombre, categoría, atributos, publicación, módulo origen, sede/negocio, disponibilidad declarada con fecha si existe | `channel_id + item_type + item_id`; altas/ediciones/bajas, suspensión del módulo. |
| `tourism_content_search` | id, clase, localidad, ventana temporal, título, fuente/organismo, geo y publicación | `channel_id + content_id`; aprobación, corrección, vencimiento o baja. |

**Evento de publicación:** al confirmar la transacción de alta/edición/ocultamiento se emite un evento interno (`entity_type`, `entity_id`, `channel_id`, `version`, `operation`, `timestamp`), idealmente mediante outbox transaccional o mecanismo equivalente ya disponible. Trabajador idempotente recalcula **desde la fuente actual** toda la proyección afectada; una baja o pérdida de permiso elimina la entrada. Eventos repetidos o fuera de orden no resucitan datos privados: comparar versión y leer estado actual. Cambios de carta/catálogo disparan actualización de ítems; cambios de rubro/localidad, del documento de sede y dependencias. Un cambio de plan no debe borrar automáticamente un negocio público si sigue publicado, pero sí recalcular qué datos de módulo se pueden mostrar.

**Operación:** cola con reintentos y fallos visibles, métrica de retraso y reconciliación periódica entre fuente e índice; acción administrativa «reindexar prestador/sede» y reconstrucción completa con swap atómico cuando sea necesario. Fijar un objetivo de frescura medible (propuesta inicial: cambios públicos visibles en búsquedas en ≤ 2 minutos, sujeto a infraestructura real); revocación de visibilidad aplicada en lectura desde fuente/ACL aun si el índice se atrasa. El prompt del modelo no se edita al sumar un prestador: los datos se publican, proyectan y buscan.

## 7. Experiencia «Estoy de visita» y armado del día

Pantalla de bienvenida: «Estoy de visita», «Vivo acá» y «Preguntar directamente». Si elige visita: accesos «Armar mi día», «Paseos y experiencias», «Dónde comer», «Eventos», «Compras útiles para el viaje» y campo libre. Preguntar progresivamente lo que falte: localidad de partida, día/franja, con quién viaja, transporte/movilidad, intereses y presupuesto opcional. Ejemplo de chips: «Con chicos», «En pareja», «Con amigos», «Sin auto»; pueden editarse y saltearse.

Motor de itinerarios: recuperar POI/excursiones/eventos y prestadores pertinentes **con fuentes y horarios**; construir 2–5 paradas cercanas o con traslado plausible según medio de transporte. No insertar cabañas en un paseo diurno por mera coincidencia de palabras; alojamiento solo si se solicitó. Elegir ventanas temporales compatibles con evento u horario publicado; si falta un horario, marcar «a confirmar». Relacionar restaurante/merienda o comercio turístico solo cuando aporta a la secuencia. Calcular rutas con proveedor disponible si existe; de lo contrario no prometer tiempos ni conexiones. Devolver tarjetas, marcadores numerados, orden de visita, razones y controles «Cambiar parada», «Menos traslados», «Agregar almuerzo». No reservar, comprar entradas ni confirmar cupos sin integración transaccional.

El plan debe abarcar todas las localidades del canal según ubicación y movilidad, pero no fingir que cruzar todo el Valle en una tarde es práctico. Si una familia sin auto sale de una localidad con pocos datos, proponer opciones locales o consultar si puede trasladarse. El usuario puede pedir algo distinto en cualquier momento y el motor cambia de tarea conservando contexto.

## 8. Experiencia «Vivo acá»

Pantalla de bienvenida: «Buscar un producto», «Encontrar un servicio», «Comer o pedir comida», «Actividades y eventos», «Cerca de mí» y campo libre. La localidad elegida persiste durante la sesión y se puede cambiar. Para producto, partir de categoría compatible y comprobar ítem/afirmación propia; para servicio, comprobar actividad y prestación; para gastronomía, filtrar rubro y usar carta solo para platos concretos. Para horario «abierto ahora», exigir horario vigente verificable, distinguir «horario a consultar» y jamás inferir apertura del día de una descripción.

Cuando se pidan datos de interés público (salud, seguridad, transporte, emergencias), no aplicar prioridad comercial por sobre exactitud y fuentes oficiales. Ante ambigüedad médica potencialmente urgente, dar prioridad a la orientación de urgencia y aclarar qué se busca; no inferir equipos ni inventar stock.

## 9. Información turística municipal estandarizada

Cada oficina de turismo opera sobre **sus localidades habilitadas** con rol `tourism_editor`, y opcionalmente un `tourism_reviewer`/administrador aprueba antes de publicar. El canal administra autorizaciones, taxonomía y contenido compartido del Valle. En un espacio editorial con vista previa, mapa y control de versiones se crean:

| Tipo canónico | Campos específicos adicionales a los comunes |
| --- | --- |
| `place` (paseo/atractivo/POI) | categoría, acceso, duración estimada, dificultad/accesibilidad si verificada, horario/temporada si aplica, costo/entrada si confirmado. |
| `activity`/`excursion` | operador público vinculado si existe, punto de encuentro, duración, requisitos, edad mínima o restricciones verificadas, contacto/reserva real, calendario si existe. |
| `event`/`festival` | comienzo y fin con zona horaria, sede, recurrencia como ocurrencias explícitas, programa/enlace, precio si confirmado, cancelación/estado. |
| `notice` (acción/campaña/información) | organismo, destinatarios, vigencia, condiciones, contacto, enlace oficial. No mezclar campañas con eventos solo por tener fecha. |
| `route` (circuito sugerido) | secuencia de POIs existentes, modo de movilidad, distancia/duración solo verificadas, condiciones temporales. |

**Campos comunes requeridos:** tipo, título, localidad canónica, descripción breve, organismo responsable, fuente/URL o documento interno verificable, fecha de revisión, estado de publicación. Ubicación exacta, accesibilidad, horarios, imágenes y contacto son opcionales según tipo, pero no se inventan. Guardar también `source_id` municipal estable, atribución y licencias de imagen, válido desde/hasta, sello editorial, última actualización y razón de corrección. Un evento terminado deja de presentarse como próximo; puede permanecer como histórico no recuperable para «qué hacer hoy». Fotos y coordenadas requieren revisión de permiso/precisión. Un contenido municipal puede apuntar a una ficha de prestador existente, sin duplicarla como segundo comercio.

## 10. Importación desde Excel: plantilla y herramienta para oficinas

Implementar una **plantilla `.xlsx` versionada**, descargable desde el panel, y un importador con la misma validación del formulario manual. Una hoja `Instrucciones` con tipos y ejemplos; hojas `Lugares`, `Actividades`, `Eventos`, `Avisos`, `Circuitos` y, para circuitos, `ParadasCircuito`. Se puede entregar primero un subconjunto según módulos reales, pero conservar el contrato y reportar los faltantes. Encabezados estables; IDs de localidad/tipo se seleccionan de catálogos desplegables o se resuelven por alias controlados durante la vista previa. No permitir que un texto libre cree una localidad nueva sin revisión.

Columnas comunes para `Lugares`, `Actividades`, `Eventos`, `Avisos` y `Circuitos`:

| Campo Excel | Requerido | Validación / significado |
| --- | --- | --- |
| `external_id` | Sí | Clave estable asignada por la oficina, única por organismo+tipo; base de actualización idempotente. |
| `localidad` | Sí | Debe resolver a una localidad publicada/autorizada del canal. |
| `titulo` | Sí | Texto visible, sin HTML ejecutable; longitud acotada. |
| `descripcion` | Sí | Breve, factual, en español; texto largo opcional aparte. |
| `fuente_url` / `fuente_documento` | Una de dos | Procedencia oficial comprobable o documento institucional adjunto/referenciado. |
| `fecha_revision` | Sí | Fecha ISO `AAAA-MM-DD`, útil para caducidad editorial. |
| `direccion`, `latitud`, `longitud` | No | Si hay geo, lat/lon vienen juntas, en rango válido, ubicación dentro de ámbito o revisión explícita. |
| `contacto`, `url_publica`, `imagen_url` | No | Formato válido, visibilidad y derechos; URL no se descarga automáticamente sin revisión. |
| `estado_solicitado` | No | `borrador` por defecto; `publicar` requiere permiso y aprobación según política. |

Columnas por hoja: `Lugares`: `categoria`, `acceso`, `duracion_min`, `accesibilidad_verificada`; `Actividades`: `categoria`, `operador_business_id` opcional, `punto_encuentro`, `duracion_min`, `reserva_url`; `Eventos`: `inicio_local`, `fin_local`, `zona_horaria` (por defecto del canal), `lugar`, `programa_url`, `estado_evento`; `Avisos`: `vigente_desde`, `vigente_hasta`, `organismo`, `destinatarios`; `Circuitos`: `movilidad`, `duracion_min`; `ParadasCircuito`: `circuito_external_id`, `orden`, `lugar_external_id` o `place_id`. Enumeraciones y formatos documentados dentro de la plantilla real que Codex genere. Usar celdas ISO o fechas Excel normalizadas por el importador; evitar conversiones ambiguas `03/04`.

**Flujo de importación:** descargar plantilla → cargar `.xlsx` → detectar versión y hoja → validar archivo/tamaño/fórmulas, cabeceras y roles → parsear en área temporal → vista previa por fila con crear/actualizar/sin cambios/error, advertencias y mapa de ubicaciones → usuario confirma → transacción por lote acotado y resultado por fila → aprobación editorial si aplica → publicación → eventos de indexación. No ejecutar fórmulas ni aceptar macros; no importar planillas con enlaces externos ejecutables. Nunca modificar registros ajenos al organismo/localidad autorizado. Mantener historial de importación, autor, hash, archivo si la política lo permite, mapeo `external_id`→id interno, reversión de importación pendiente o corrección por nueva versión. Reimportar el mismo archivo no duplica; omisiones en la planilla **no borran** datos existentes; bajas requieren columna/operación explícita y confirmación especial. Fallo de 3 filas no impide procesar las válidas solo si el usuario confirmó importación parcial y obtuvo informe; de otro modo todo el lote permanece sin aplicar.

## 11. Mapa de todo lo cargado

Mostrar mapa inicial con **todos los puntos públicos con coordenadas válidas** del canal CalamuchitAr dentro del viewport apropiado, no solo los resultados de una localidad, con agrupamiento por zoom para no superponer cientos de pins. Capas o filtros: comercios, servicios, gastronomía, alojamientos, atractivos, actividades y eventos; los colores/iconos responden a clase validada. La lista y el mapa comparten IDs estables. Clicar un marcador abre ficha resumida con foto real, nombre, rubro, localidad y acciones; clicar una tarjeta centra/resalta el punto. Los negocios sin coordenadas siguen presentes en búsquedas/listados pero no se inventa pin. Un evento usa su sede verificada, o muestra localidad sin pin exacto.

Al hacer una consulta, el mapa distingue capa general (puntos del canal) de **resultados de esta búsqueda**, destacando estos últimos y adaptando el viewport. En desktop, chat y mapa lado a lado; en móvil, chat legible con botón «Ver mapa» y retorno sin perder sesión. Agregar búsqueda/filtros, controles de zoom, localización voluntaria, atribuciones del proveedor cartográfico y carga incremental por bounding box/zoom si el volumen lo requiere. Nunca enviar datos privados a mapas externos. Solo mostrar distancia si están ambas coordenadas y el método de cálculo identificado; navegación externa si hay punto o dirección pública fiable.

## 12. Voz y relación con la referencia Otto

En las capturas aportadas por el usuario, Otto muestra campo de texto y el modal Plus enumera respuesta prioritaria, beneficios y consultas ilimitadas. La página pública de Otto habla de conversación y planificación; no ofrece evidencia suficiente para afirmar que Otto Plus incluya micrófono o voz. **No usar la supuesta oferta de Otto para decidir Muchi.** Muchi ya tiene intención de ofrecer voz: especificar por separado tres capacidades, cada una opcional y compatible con el mismo núcleo textual: (A) escribir→leer texto; (B) hablar→transcripción→respuesta en texto; (C) hablar→transcripción→respuesta en texto y audio sintetizado. El usuario siempre ve el texto, corrige la transcripción antes de enviar si lo desea, puede activar/desactivar sonido y conceder micrófono explícitamente.

Registrar y limitar costos distintos de transcripción, generación de texto y síntesis, con cuotas configurables y degradación a texto. No guardar audio crudo por defecto; revisar retención y consentimiento. La disponibilidad de voz gratuita o paga es **decisión comercial de Muchi** futura; no requiere duplicar el motor ni cambia rubros/índice/ranking.

## 13. APIs y límites de confianza (adaptar a rutas existentes)

| Operación conceptual | Parámetros esenciales | Responsabilidad |
| --- | --- | --- |
| `POST /assistant/query` | mensaje, sesión, modo, localidad/filtros, permiso de ubicación | interpretar, validar, recuperar, filtrar, ordenar y devolver texto + tarjetas + mapa + evidencias. |
| `GET /assistant/map` | canal, bbox, zoom, capas, filtros | puntos públicos agrupados con IDs canónicos, paginación/carga incremental. |
| `POST /assistant/plan` | sesión, preferencias voluntarias | itinerario basado en contenido elegible y restricciones temporales. |
| `GET/POST /tourism-content` | rol, localidad, clase, datos validados | edición y aprobación del contenido municipal. |
| `GET /tourism-import/template` | versión | plantilla Excel real y guía de columnas. |
| `POST /tourism-import/preview` y `/commit` | archivo, token temporal, política de lote | validación previa y aplicación autorizada, registro por fila. |
| `POST /search-index/rebuild` (admin) | canal/entidad, motivo | reindexación auditable, idempotente y protegida. |

El frontend no decide publicación, posición comercial, permisos ni elegibilidad. El servidor vuelve a verificar derechos al leer ítems de módulos y al generar enlaces. Rate limiting, protección ante instrucciones en textos de fichas, cuotas del modelo, límites de tamaño y trazas sin datos sensibles. Cachés e índices jamás pueden devolver una ficha recién ocultada por un prestador.

## 14. Pruebas y criterios de aceptación

1. Consulta «restaurantes en [localidad]»: aparece un restaurante con rubro publicado; una cabaña que menciona restaurantes en su texto **no** aparece. Si la cabaña también opera un restaurante publicado y accesible, aparece esa actividad justificada.
2. «Quiero comer milanesa»: carta publicada con milanesa habilita decir que el plato figura en el menú; un restaurante sin carta solo puede figurar como alternativa para consultar. Ninguno afirma stock o mesa libre sin consulta vigente.
3. «Busco [producto]»: un comercio compatible con producto publicado entra; otro que solo menciona el término en un artículo ajeno no entra; comercio sin catálogo pero rubro compatible puede ser alternativa rotulada.
4. Alta/publicación de una nueva sede y rubro: aparece en lista/índice dentro del objetivo de frescura sin cambiar prompt ni reiniciar IA. Alta de producto/plato actualiza coincidencias; baja/ocultamiento elimina acceso inmediatamente incluso si el índice está atrasado.
5. Todas las localidades vigentes del canal pueden usarse como origen/filtro; una localidad agregada por administración pasa a estar disponible sin despliegue de código. Las fichas de otro canal quedan excluidas.
6. Los chips «Con chicos» y «Sin auto» orientan el plan turístico, pero una pregunta escrita libre tiene prioridad sobre ellos si el usuario corrige su intención; omitir chips no impide consultar.
7. Residente que pide un servicio obtiene prestadores por rubro y servicio; turista que pide el mismo servicio también puede obtenerlos. La diferencia está en entrada, contexto y propuesta de plan, no en un catálogo prohibido.
8. Un Excel municipal válido se previsualiza, importa, requiere aprobación según rol y se proyecta al índice/mapa; reimportación no duplica; localidades ajenas y fecha inválida generan error por fila; omitir una fila no elimina registros.
9. Mapa inicial agrupa todos los puntos públicos con coordenadas; filtros por rubro y chat sincronizan lista/marker; fichas sin coordenadas se listan sin pin. Móvil conserva contexto al alternar mapa.
10. «Armar mi día» con niños, sin auto, tarde y origen local produce paradas razonables y factibles según datos publicados; no intercala alojamiento ni otra categoría no pedida ni inventa horarios.
11. Evaluación con conjunto de consultas etiquetadas por rubros variados y paráfrasis: medir precisión de elegibilidad por categoría, tasa de recomendaciones sin evidencia, recall de fichas publicadas, latencia y frescura. Para publicar, **cero errores de elegibilidad** en los casos críticos de aceptación y objetivos de métricas definidos tras medir baseline real. Guardar trazas explicables `query_intent → filtros → candidatos → razones de exclusión → orden → respuesta`.

## 15. Fases y entregables de Codex

**Fase 0:** informe de auditoría con tablas/rutas reales; mapa existente→contratos de este documento; matriz de rubros, módulos, publicaciones, localidades, cartografía y oficinas de turismo; baseline de consultas y problemas de datos. No empezar migraciones sin conocer el modelo existente.

**Fase 1:** corregir elegibilidad por rubro, producto/plato y localidad; filtros de publicación/permisos; índice derivado y eventos de actualización; trazas y pruebas de regresión. Mostrar respuestas de extremo a extremo antes/después para distintos rubros. Entregar usable aun si no existe búsqueda vectorial.

**Fase 2:** entradas turista/residente y chips opcionales, itinerarios con contenido turístico disponible; mapa completo + sincronía con chat en escritorio y móvil; medios y acciones reales.

**Fase 3:** panel editorial municipal, plantilla Excel, preview/import y aprobaciones, eventos/atractivos y reconciliación de índice. Luego optimizar búsqueda semántica, voz y monetización si la operación los justifica.

**Entregar:** código, migraciones mínimas justificadas, contratos y decisiones, plantilla `.xlsx` generada por el panel, guía para prestadores y oficinas, configuración/admin, pruebas significativas, métricas de índice, capturas del mapa y respuestas representativas. Marcar con precisión qué partes faltan por ausencia de datos, módulos o autorizaciones; no presentarlas como funcionales.

## 16. Texto para pegar a Codex

> Ajustá el Muchi existente en Tags a `Especificacion_Motor_IA_Muchi_CalamuchitAr.md`. El alcance son todas las localidades y fichas públicas del directorio CalamuchitAr. Primero auditá entidades, rubros, publicaciones y módulos reales; implementá elegibilidad por rubro/actividad ANTES de usar descripciones, cercanía o prioridad comercial. Carta y tienda aportan ítems solo si están habilitados y públicos. Implementá índice derivado y actualizado con altas/ediciones/bajas, dos modos y plan del día turístico, panel municipal con importación Excel y mapa completo sincronizado con el chat, en fases comprobables. Probá que una cabaña que menciona restaurantes no aparezca ante «restaurante» y casos equivalentes en varios rubros. Mostrame archivos reales, trazas, tests, respuestas y capturas; no basta con compilar. No supongas que Otto Plus tenga voz: diseñá voz opcional para Muchi independientemente.

### Referencia pública limitada

La página pública de Otto describe su propuesta como guía que recomienda y arma planes, y su flujo `/explorar` muestra opciones «En pareja», «En familia, con chicos», «Con amigos», «Solo/a» y «Prefiero escribirle directo» (consultados el 27-09-2026). Esto inspira el patrón de interacción; no implica conocer sus algoritmos ni sus funciones de voz. Fuente: https://ottoteguia.com/ y https://ottoteguia.com/explorar .
