# Tags Destination AI — Asistente CalamuchitAr

**Especificación funcional y guía de análisis para Codex**  
**Versión:** 1.0 · 24 de septiembre de 2026  
**Estado:** requisitos de producto acordados; implementación sujeta a auditoría del repositorio Tags.

## 1. Objetivo

Construir en Tags un motor reutilizable para asistentes de directorios, destinos y comercios. CalamuchitAr será el primer canal. El asistente ayudará a turistas y residentes a descubrir prestadores, servicios e información pública, mostrará resultados visuales y contextualizados y utilizará las funciones contratadas y autorizadas por cada prestador. Debe acercar la consulta a una acción comercial sin inventar datos ni confirmar reservas o turnos en la primera versión.

**Instrucción a Codex:** inspeccionar primero la arquitectura y los datos reales de Tags. Los nombres de entidades, estados, rutas y contratos que siguen son conceptuales; adaptar su implementación a los existentes. Presentar un mapa de componentes, brechas y fases antes de hacer cambios estructurales. Después desarrollar el MVP de forma incremental, con verificaciones representativas. No crear un sistema paralelo ni duplicar la fuente de verdad de suscripciones y add-ons.

## 2. Principios obligatorios

1. **Un motor, múltiples canales.** Configuración por directorio/canal (identidad, territorio, fuentes, reglas comerciales y módulos). Evitar literales de CalamuchitAr en la lógica central.
2. **Un asistente, dos modos.** Turista y residente comparten motor; puede elegirse al inicio, inferirse provisionalmente o cambiarse durante la sesión. Hay una opción de consultar sin elegir.
3. **Tags como fuente de verdad comercial.** El backend determina en tiempo de consulta si un negocio es abonado, qué módulos contrató, cuáles están configurados, qué se publica y qué se autorizó consultar desde IA. El modelo no consulta tablas directamente ni decide quién paga.
4. **Separar confianza de prioridad comercial.** Procedencia/actualización de un dato y condición de abonado son ejes distintos. Nunca llamar “verificado” a un dato únicamente por ser pago.
5. **Primero elegibilidad.** Respetar intención, rubro, localidad, restricciones explícitas y seguridad; luego presentar abonados elegibles antes de fichas gratuitas y resultados externos. La falta de configuración de un add-on no elimina ni rebaja automáticamente al abonado: se ofrece contacto.
6. **Ausencia de dato ≠ respuesta negativa.** Horarios sin cargar no significan cerrado; calendario sin configurar no significa sin disponibilidad; stock desconocido no significa agotado. Explicar qué se pudo verificar y cuándo.
7. **Información pública sensible.** Emergencias, salud pública, organismos y otras consultas de interés público utilizan fuentes oficiales y pertinencia; no aplica la prioridad comercial.
8. **Datos y fotos con procedencia.** Usar imágenes reales autorizadas de la ficha Tags y, si está permitido, fotos de fuentes externas con sus condiciones de uso y atribución. Nunca generar una supuesta foto de un prestador real.
9. **Permisos y mínimo acceso.** El backend expone al asistente solo datos públicos autorizados y operaciones explícitas. El MVP consulta disponibilidad, pero no crea turnos, reservas, pedidos ni compras.

## 3. Experiencia de conversación

### Inicio y contexto

- Inicio: “Estoy de visita”, “Vivo acá”, “Preguntar directamente”. Cambio de modo accesible en cualquier momento.
- Turista: alojamiento/localidad, fechas, composición del grupo, edades de menores, transporte, intereses, presupuesto y preferencias, recabados progresivamente.
- Residente: localidad, necesidades frecuentes, movilidad y restricciones pertinentes. No asumir datos personales sin consentimiento.
- Recordar dentro de la sesión referencias como “el segundo”, “el B”, “cerca de ese lugar”, fechas y preferencias. Permitir corregir y borrar contexto. No persistir información personal entre sesiones por defecto.
- Pedir geolocalización solo si aporta valor y con permiso explícito; permitir indicar ubicación manual. Mostrar distancia únicamente si se conocen coordenadas fiables y origen de cálculo.
- Resolver fechas relativas con zona horaria del canal (CalamuchitAr: Argentina); en respuestas críticas mostrar fecha y hora completas.

### Resultados

- Respuesta breve acompañada de tarjetas con nombre, imagen real si existe, rubro, localidad, distancia calculada cuando proceda, estado horario verificable, descripción y motivo concreto de pertinencia.
- Mapa sincronizado con tarjetas identificadas de forma estable (A, B, C); selección posterior mediante letra, nombre o posición. Opción de abrir navegación.
- Acciones solo si el dato/enlace existe y el negocio las expone: WhatsApp, llamar, web, QR-Page, menú/catálogo, productos, ubicación, consultar turno/reserva/disponibilidad, promociones/beneficios. No prometer una acción que el módulo aún no soporte.
- Itinerarios para turistas: tramos con horario tentativo, desplazamientos plausibles y alternativas; no afirmar apertura, cupos o precios sin datos vigentes. Cada parada se enlaza a ficha y acciones disponibles.
- Para información oficial, indicar la fuente y fecha de consulta. Si no hay cobertura, decirlo y ofrecer búsqueda ampliada o contacto apropiado.

## 4. Descubrimiento y prioridad de prestadores

### Clasificación independiente

| Dimensión | Valores conceptuales | Uso |
| --- | --- | --- |
| Relación comercial | `subscriber`, `free_listing`, `external` | Orden y presentación de búsquedas comerciales |
| Procedencia | `business_managed`, `official`, `external_api`, `general` | Sustento, atribución y cautela del dato |
| Verificación | Verificado según criterio documentado / sin verificar | Etiqueta visible solo si existe un proceso real |
| Capacidad | Contratada, configurada, pública, autorizada para IA, consultable | Qué puede consultar y mostrar el asistente |

### Reglas de ranking

1. Filtrar por coincidencia con la intención, ubicación y restricciones obligatorias. En “abierto ahora”, un horario desconocido no equivale a abierto: mostrarlo aparte como “horario a consultar” si resulta útil; un cierre confirmado no satisface ese filtro.
2. En una búsqueda comercial, agrupar primero **abonados pertinentes**, después **fichas gratuitas pertinentes** y finalmente **externos pertinentes**, cuando sean necesarios para dar cobertura. Dentro del grupo ponderar cercanía, coincidencia, información verificable y calidad de la ficha. La condición de add-on no elimina un abonado.
3. Mostrar claramente por qué se sugiere cada opción y qué dato no está confirmado. No declarar “disponible” por inferencia ni “verificado” por pagar.
4. Si una restricción es indispensable (por ejemplo accesibilidad, urgencia, horario específico), no presentar una opción sin confirmación como si cumpliera. Puede presentarse como alternativa “consultar directamente”, separada de opciones confirmadas.
5. Si varios abonados cumplen, incluir tanto al que tiene disponibilidad comprobable como al que requiere consulta directa. Si uno está expresamente sin disponibilidad para la fecha pedida, informarlo y ofrecer otras fechas o alternativas pertinentes.
6. Deduplicar fichas Tags y fuentes externas por identificadores, ubicación y datos coincidentes; evitar que un resultado externo desplace una ficha propia duplicada.
7. Las reglas de orden deben aplicarse en backend, ser explicables y configurables por canal; el LLM redacta a partir de resultados ya autorizados y ordenados.

## 5. Capabilities dinámicas y fallback universal

La secuencia de decisión por negocio es **cliente abonado → add-ons/plan y estado → configuración efectiva → visibilidad pública → permiso para IA → dato consultable → acciones disponibles**. También ofrecer información básica a un abonado sin el módulo específico. No crear toggles duplicados si ya existen permisos equivalentes en Tags.

Un adaptador interno por módulo debe exponer un contrato normalizado de lectura: nombre de capability, operaciones de consulta, campos requeridos, estado, marca temporal, procedencia, acciones públicas y contacto alternativo. Ejemplos: turnos, reservas de mesas o actividades, Mi Estadía, Store, Resto, fidelización, reseñas, chatbot del negocio, catálogo, QR-Page y futuros módulos. **Comprobar los nombres y APIs reales en el código.** El motor nunca confía en un flag del cliente web para autorizar una operación.

### Semántica de resultados

| Estado conceptual | Qué significa | Mensaje y acción |
| --- | --- | --- |
| `AVAILABLE` | Consulta válida confirma opciones para el criterio indicado | Mostrar opciones, hora de consulta y contacto para confirmar |
| `UNAVAILABLE` | Consulta válida confirma ausencia de cupo/stock para ese criterio | Decirlo con alcance preciso; ofrecer otras opciones o fechas |
| `NOT_CONFIGURED` | Módulo o datos necesarios aún sin configurar | “No tengo disponibilidad publicada”; facilitar contacto |
| `NOT_PUBLIC` | El prestador no expone ese dato a usuarios/IA | No revelar detalle privado; facilitar contacto público si existe |
| `NOT_SUPPORTED` | No hay consulta digital para ese dato | Facilitar contacto sin afirmar ausencia del servicio |
| `UNKNOWN` | Fallo, dato obsoleto o respuesta ambigua | Explicar que no puede verificarse ahora y facilitar contacto |

Estos son estados del **dato consultado**, distintos del contrato del módulo y su suscripción. Un add-on desactivado, cancelado o vencido no habilita su consulta. En cualquier estado sin verificación, el prestador pertinente permanece como alternativa, salvo que una restricción del usuario exija prueba concluyente. Mostrar WhatsApp, teléfono o web solo si están publicados y autorizados; si falta un canal, usar el siguiente disponible. El enlace WhatsApp puede incluir fechas, servicio y cantidad de personas comunicados por el usuario; abrir el enlace para que el usuario revise y envíe. No enviar mensajes automáticamente.

**Ejemplo de alojamiento:** “Cabañas A publica disponibilidad del 12 al 15 de octubre; verificada a las 15:20. La reserva se confirma con el prestador”. “Cabañas B también es abonado; no puedo consultar su calendario para esas fechas. [Consultar por WhatsApp]”. Nunca traducir “calendario sin configurar” como “sin lugar”.

**Ejemplo de peluquería:** solicitar servicio, fecha y franja horaria; consultar Tags Turnos solo cuando está expuesto y habilitado. Mostrar turnos observados y enlace de contacto; no retener cupo ni decir “turno reservado”. Para restaurante, cancha, profesional y alojamiento, adaptar parámetros al módulo y rubro real, sin programar diálogos rígidos por cada rubro.

## 6. Fuentes, búsquedas y fotografías

- Datos estructurados de Tags para negocios, categorías, localidades, horarios, coordenadas, servicios, productos y add-ons públicos.
- Conocimiento extenso del negocio, incluidas entradas existentes de `tags_ai_chatbot_knowledge` si su uso público está autorizado. Conocimiento turístico de fuentes oficiales con URL, fecha de actualización y jurisdicción.
- Búsqueda estructurada para filtros verificables; recuperación semántica para descripciones; RAG con fragmentos trazables para textos largos; APIs vigentes para datos dinámicos (clima, disponibilidad). No volcar todas las tablas a un vector store ni basarse en memoria del modelo para datos operativos.
- Servicios externos, como Google Places, solamente tras verificar disponibilidad técnica, condiciones de uso, costos, límites, atribución, almacenamiento permitido, licencias de fotos y autorización. Implementar fallback opcional y desacoplado; si no está disponible, el MVP sigue siendo útil con datos Tags y oficiales.
- Imágenes: preferir portada y galería Tags, luego recursos externos utilizables conforme a licencia. Guardar `source`, autor/atribución cuando aplique, referencia, enlace y vigencia permitida. No mostrar logos como supuestas fotografías. Si no hay imagen lícita, tarjeta sin foto o recurso visual genérico claramente no atribuido al lugar.
- Datos de apertura, tiempo, precios, stock y cupos deben tener momento de consulta y caducidad apropiada. La interfaz no debe presentar información caducada como actual.

## 7. Arquitectura propuesta para validar en repositorio

```text
UI del canal (chat, tarjetas, mapa)
  → API del asistente (sesión, permisos, límites)
  → Orquestador Tags AI (intención, contexto, búsqueda, redacción)
  → Servicios autorizados (directorio, capabilities, conocimiento, clima, fuentes externas)
  → Datos existentes de Tags y APIs externas
```

Contratos conceptuales: `SearchRequest` (modo, intención, filtros, ubicación autorizada, fecha), `Candidate` (id canónico, canal, rubro, relación comercial, fuentes, fotos, acciones), `CapabilityResult` (operación, estado, datos públicos, timestamp, fuente), `AssistantResponse` (texto, tarjetas, mapa, referencias y preguntas de seguimiento). Definir contratos reales después de revisar tipos y rutas existentes.

La búsqueda y los adaptadores de capabilities ejecutan validaciones en servidor; el modelo invoca herramientas de lectura con parámetros tipados y recibe únicamente datos filtrados. Prevenir instrucciones embebidas en contenido de negocios o páginas externas. Acotar consultas, cuotas y tamaño de respuestas; no exponer secretos ni configuraciones privadas. Cualquier futura operación de escritura requiere autorización y diseño propios.

## 8. Analytics y paneles

Registrar por canal y prestador: impresiones de tarjeta, recomendación visible, apertura de ficha, clic a WhatsApp/teléfono/mapa/web, consultas de disponibilidad, resultados verificables e intención agregada. Separar impresiones de clics y de conversiones realmente confirmadas; un clic no equivale a una reserva. Panel básico para administrador y métricas del prestador con controles de acceso. Evitar registrar mensajes o ubicación exacta innecesariamente; definir retención, consentimiento y anonimización según políticas vigentes.

Indicador opcional de integridad de ficha: ubicación, contacto, horario, descripción, fotos, servicios y configuración de add-ons. Debe orientar al prestador y mejorar la calidad de resultados entre candidatos similares, sin hacer desaparecer abonados con fichas incompletas.

## 9. Fases de entrega

### Fase 0 — Auditoría obligatoria de Tags

Identificar rutas, estructura del directorio, tenant/canal, modelo de empresas y categorías, planes/add-ons/estado de abono, visibilidad pública, permisos, horarios, geodatos, fotos, conocimiento IA, Turnos, Reservas, Mi Estadía y otros módulos existentes. Revisar si hay contratos de disponibilidad y APIs reutilizables, analytics y mapa, infraestructura LLM, costos y controles. Documentar **existente / reutilizable / faltante / bloqueado por dependencia**, con rutas reales del repositorio. Detectar qué módulo no existe o no permite lectura pública; no inventar sus endpoints. Fijar las dependencias antes de comprometer un cronograma.

### Fase 1 — MVP funcional

1. Configuración por canal y UI CalamuchitAr: modo turista/residente, chat, contexto de sesión y cambio de modo.
2. Búsqueda de fichas Tags con filtros, ubicación voluntaria, prioridades abonado/gratuito, deduplicación, tarjetas con fotografías propias y mapa.
3. Información turística/pública curada, con fuentes; consultas meteorológicas solo si hay proveedor viable.
4. Registro de capabilities derivadas dinámicamente de Tags; integración de lectura de los módulos **efectivamente disponibles** en el repo, empezando por disponibilidad de Turnos/Reservas/Mi Estadía si sus APIs lo permiten. Fallback de contacto para todos los rubros.
5. Itinerarios basados en datos verificables, enlaces de acción, eventos analíticos y panel básico.
6. Pruebas de las reglas críticas del apartado 10 y revisión manual móvil/escritorio.

**Criterio de alcance:** las funcionalidades cuya fuente o módulo aún no exista deben quedar aisladas tras una interfaz y visibles en el informe de brechas; no simular consultas reales con datos inventados. Entregar el MVP utilizable y marcar con precisión las dependencias pendientes.

### Fase 2 — Ampliaciones

Fuentes externas autorizadas y fotos bajo licencia; búsqueda semántica ampliada; promociones y fidelización; integración de Store, Resto y Mi Estadía más profunda; leads y atribución comprobable; mejoras de personalización y analítica. Evaluar creación de turnos/reservas/pedidos únicamente con flujos transaccionales, confirmaciones y permisos específicos.

## 10. Criterios de aceptación imprescindibles

1. Usuario alterna turista/residente y las respuestas cambian según intención y contexto, sin perder referencias de la sesión.
2. Ante dos prestadores abonados pertinentes, uno con disponibilidad publicada y otro sin calendario configurado, aparecen ambos: el primero con dato y hora de consulta; el segundo “a consultar” con contacto. Ninguno aparece como reservado.
3. Un abonado sin add-on de Turnos o Mi Estadía sigue siendo candidato pertinente y ofrece sus datos de contacto públicos; un add-on contratado pero privado no expone datos privados.
4. Un `UNAVAILABLE` confirmado informa que la consulta concreta no tiene cupo; `NOT_CONFIGURED`, `NOT_PUBLIC`, `NOT_SUPPORTED` y `UNKNOWN` no se convierten en “sin cupo”.
5. En búsquedas comerciales, los abonados pertinentes se presentan antes que fichas gratuitas y externas; no se sustituye un requisito explícito por un abonado que no lo cumple. Emergencias usan fuentes oficiales.
6. Una ficha propia y su réplica externa se muestran una sola vez; la foto visible tiene procedencia conocida; la tarjeta sin foto funciona correctamente.
7. “El segundo”, “el B” y “cerca de ese lugar” remiten al resultado elegido; el mapa acompaña a la selección.
8. Fechas, franjas, distancias, horario de apertura, cupos y clima no se afirman si faltan fuentes válidas; los fallos de API degradan a información verificable o contacto.
9. Los eventos distinguen exposición, clic y consulta; no atribuyen una compra/reserva sin confirmación.
10. Las operaciones habilitadas en el MVP son de lectura; la UI no afirma que un turno, mesa o alojamiento esté confirmado.

## 11. Entregables esperados de Codex

- Informe inicial de auditoría con referencias a archivos y rutas reales, brechas, riesgos, dependencias y decisiones propuestas.
- Contratos implementables basados en el repositorio, matriz de capabilities por módulo y canal, reglas de ranking y estados documentados.
- MVP integrado en Tags/CalamuchitAr, migraciones mínimas justificadas, configuración y pruebas significativas.
- Instrucciones de puesta en marcha y configuración de proveedores externos cuando hagan falta; lista exacta de funciones habilitadas y pendientes, sin afirmar que algo ya existe hasta comprobarlo.

**Decisión de producto definitiva:** abonado pertinente con datos incompletos sigue apareciendo y se ofrece contacto; un dato desconocido nunca se transforma en una negativa. El sistema consulta funciones autorizadas de Tags para aportar precisión, pero la confirmación final de cada operación queda en manos del prestador y del usuario en el MVP.
