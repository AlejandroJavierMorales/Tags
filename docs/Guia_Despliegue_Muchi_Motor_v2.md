# Guía de despliegue — Muchi Motor v2

El motor v2 no se activa por subir el código. La secuencia evita dejar el chat apuntando a tablas vacías y permite volver temporalmente al motor anterior sin borrar datos.

## 1. Subir el código

Subir la aplicación completa, incluyendo:

- `database/migrations/2026-09-27-tags-destination-ai-engine-v2.sql`
- `scripts/destination-ai/backfill-engine-v2.mjs`
- los cambios de `app/modules/destination-ai`, `app/api/ai/chat` y `app/muchi`.

No es necesario volver a ejecutar la migración del índice documental del 26 de septiembre.

## 2. Ejecutar la migración

En phpMyAdmin, seleccionar expresamente la base de CalamuchitAr y ejecutar el archivo completo:

`database/migrations/2026-09-27-tags-destination-ai-engine-v2.sql`

La migración sólo crea tablas nuevas. No elimina ni altera Store, Resto, Turnos, las fichas del directorio o el índice anterior.

## 3. Auditar el esquema desde cPanel

```bash
source /home/tags2026/nodevenv/tags/20/bin/activate
cd /home/tags2026/tags
node /home/tags2026/tags/scripts/destination-ai/audit-schema.mjs | tail -n 20
```

En `missingTables` no deben aparecer tablas cuyo nombre comience con `tags_ai_search_` o `tags_ai_tourism_`.

## 4. Ejecutar el backfill primero en dry-run

```bash
node /home/tags2026/tags/scripts/destination-ai/backfill-engine-v2.mjs --site=calamuchitar --samples=5
```

`dry-run` significa que el script lee y prepara los datos, muestra cantidades y advertencias, pero no escribe nada. Revisar especialmente:

- `locations`
- `categoryAssignments`
- `items`
- `locationsWithoutCategory`

## 5. Aplicar el backfill

La variable debe llevar un solo signo `=` y coincidir exactamente con la base configurada:

```bash
export DESTINATION_AI_BACKFILL_CONFIRM=xncabaa4_calamuchitar
node /home/tags2026/tags/scripts/destination-ai/backfill-engine-v2.mjs --site=calamuchitar --apply
unset DESTINATION_AI_BACKFILL_CONFIRM
```

El proceso es idempotente: se puede repetir después de corregir fichas, rubros o catálogos. Conserva asociaciones que administración haya confirmado o rechazado.

Para que altas y cambios de Store, QR, Resto y Turnos se reflejen sin reconstrucciones manuales, configurar una tarea Cron de cPanel cada 10 minutos con el mismo entorno Node. El script hace `upsert`, conserva revisiones y marca como obsoletos los elementos que dejaron de estar publicados:

```bash
source /home/tags2026/nodevenv/tags/20/bin/activate && cd /home/tags2026/tags && export DESTINATION_AI_BACKFILL_CONFIRM=xncabaa4_calamuchitar && node scripts/destination-ai/backfill-engine-v2.mjs --site=calamuchitar --apply
```

Los contenidos turísticos se actualizan directamente desde administración y la base de conocimiento escrita por cada negocio refresca su proyección al guardar; no esperan al Cron.

## 6. Revisar conocimiento desde administración

Abrir `Administración del Directorio → Muchi / IA → Conocimiento y elegibilidad`.

Antes de activar públicamente:

1. Revisar asociaciones de rubro pendientes.
2. Rechazar asociaciones históricas incorrectas.
3. Confirmar los rubros críticos.
4. Crear las fuentes de turismo institucionales.
5. Cargar y publicar contenido turístico real.
6. Agregar sinónimos únicamente cuando conecten una expresión habitual con un rubro real.

## 7. Evaluar el estado

```bash
node /home/tags2026/tags/scripts/destination-ai/evaluate-engine-v2.mjs --site=calamuchitar
```

La salida es de sólo lectura. `categoryReviewComplete` debe ser `true` para una activación estrictamente revisada. `tourismCoverageStarted` indica si ya existe contenido turístico publicado.

## 8. Activar el motor

En las variables de entorno de la aplicación Node:

```text
DESTINATION_AI_INDEX_MODE=active
DESTINATION_AI_ENGINE_VERSION=v2
```

Reiniciar la aplicación desde el panel de Node.js de cPanel para que Passenger tome las variables nuevas.

El endpoint comprueba que la proyección v2 tenga datos. Si las tablas todavía no existen o están vacías, conserva el motor anterior en lugar de dejar el chat roto.

## 9. Vuelta temporal al motor anterior

No borrar tablas ni ejecutar una migración inversa. Cambiar solamente:

```text
DESTINATION_AI_ENGINE_VERSION=v1
```

y reiniciar la aplicación. Los datos v2 quedan disponibles para corregirlos y volver a activar.

## Pruebas funcionales mínimas

Las pruebas deben cubrir familias, no palabras aisladas:

- rubro exacto en localidad explícita;
- rubro sin localidad, ordenado por distancia cuando se comparte ubicación;
- producto con catálogo;
- producto declarado sólo en la presentación del negocio;
- plato de un menú gastronómico;
- servicio de Turnos y servicio declarado en una ficha básica;
- paseo o atracción institucional;
- evento vigente;
- dos necesidades distintas en un mismo mensaje;
- cambio de tema con “ahora necesito…”;
- seguimiento de una opción anterior;
- armado progresivo de un día de paseo;
- rechazo de una entidad con palabra incidental pero rubro incompatible;
- coordenadas ausentes o inválidas fuera del mapa.

El criterio crítico de aprobación es cero entidades de tipo incorrecto en la respuesta y en las tarjetas.
