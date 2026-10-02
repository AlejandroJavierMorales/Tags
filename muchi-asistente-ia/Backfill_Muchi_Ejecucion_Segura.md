# Muchi — Backfill y ejecución segura

## Qué significa `dry-run`

El backfill recorre las fuentes públicas existentes y construye en memoria los documentos que formarán el índice de Muchi.

En modo `dry-run`:

- se conecta a la base configurada;
- lee fichas, QR, Store, Turnos y conocimiento activo;
- aplica las mismas condiciones de publicación que el modo real;
- normaliza documentos, productos, servicios, ubicaciones, acciones y evidencias;
- calcula claves canónicas y hashes;
- informa totales, faltantes y ejemplos;
- **no ejecuta ningún `INSERT`, `UPDATE` ni `DELETE`**.

Es el modo predeterminado. No existe una opción implícita de escritura.

## Auditoría del esquema

```powershell
node scripts/destination-ai/audit-schema.mjs
```

La salida muestra versión de MySQL, tablas, columnas y tipos. No imprime credenciales.

## Backfill de prueba

```powershell
node scripts/destination-ai/backfill-knowledge.mjs --site=calamuchitar --samples=10
```

Comprobar una frase o producto dentro de todas las fuentes proyectadas:

```powershell
node scripts/destination-ai/backfill-knowledge.mjs --site=calamuchitar --contains="control remoto"
```

La comprobación normaliza acentos y plurales, por lo que `control remoto` también encuentra `Controles Remotos`.

Probar solamente una muestra reducida por cada fuente:

```powershell
node scripts/destination-ai/backfill-knowledge.mjs --site=calamuchitar --limit=10
```

`--limit` es para diagnóstico; no debe utilizarse en el backfill definitivo.

## Escritura en desarrollo

1. Ejecutar manualmente `database/migrations/2026-09-26-tags-destination-ai-knowledge-core.sql`.
2. Repetir el `dry-run`.
3. Confirmar explícitamente el nombre de la base en la misma terminal.
4. Ejecutar con `--apply`.

```powershell
$env:DESTINATION_AI_BACKFILL_CONFIRM=$env:DB_DATABASE_NAME
node scripts/destination-ai/backfill-knowledge.mjs --site=calamuchitar --apply
```

El script aborta si la confirmación no coincide exactamente con `DB_DATABASE_NAME` o si faltan las tablas nuevas.

## Comportamiento al escribir

- Procesa lotes de 100 documentos por defecto.
- Cada lote usa una transacción.
- Utiliza `site_id + canonical_key` para insertar o actualizar.
- Repetirlo no duplica documentos.
- Conserva claims rechazados manualmente.
- Los documentos cuya fuente dejó de estar publicada quedan con visibilidad `stale` y dejan de participar en las respuestas; no se borran y conservan su auditoría.

## Activación en producción

Después de subir el código y reiniciar la aplicación Node de cPanel:

```bash
source /home/tags2026/nodevenv/tags/20/bin/activate
cd /home/tags2026/tags
export DESTINATION_AI_BACKFILL_CONFIRM="$DB_DATABASE_NAME"
node scripts/destination-ai/backfill-knowledge.mjs --site=calamuchitar --apply
```

La salida debe finalizar con `"mode": "apply"`, `"documents"` mayor que cero y un bloque `"applied"`.

En las variables de entorno de la aplicación de cPanel configurar:

```text
DESTINATION_AI_INDEX_MODE=active
```

Luego reiniciar una vez la aplicación Node. No es necesario volver a ejecutar la migración si las seis tablas del índice ya existen.

Para que nuevas publicaciones, productos y servicios lleguen al índice sin intervención manual, configurar en cPanel un Cron Job cada 15 minutos con este comando en una sola línea:

```bash
source /home/tags2026/nodevenv/tags/20/bin/activate && cd /home/tags2026/tags && DESTINATION_AI_BACKFILL_CONFIRM=xncabaa4_calamuchitar node scripts/destination-ai/backfill-knowledge.mjs --site=calamuchitar --apply >> /home/tags2026/muchi-index.log 2>&1
```

El proceso es idempotente: actualiza por clave canónica, no duplica documentos y retira del buscador las fuentes despublicadas.

Rollback inmediato, sin perder datos:

```text
DESTINATION_AI_INDEX_MODE=shadow
```

Después de cambiarla, reiniciar la aplicación Node. `shadow` conserva el índice y vuelve a utilizar el buscador anterior mientras registra comparaciones internas.

## Resultado del primer dry-run de desarrollo

El 26 de septiembre de 2026 se verificó contra la base de desarrollo:

- MySQL 8.0.37;
- 37 documentos públicos;
- 29 prestadores;
- 6 productos;
- 2 servicios;
- 8 claims estructurados;
- ninguna escritura realizada.

Las 29 descripciones comerciales quedan completas en `searchable_text`. Por eso pueden responder a coincidencias explícitas aunque el prestador no tenga Store. La extracción editorial de claims desde lenguaje libre se implementará después como una etapa revisable; no se inventan productos durante el backfill.
