# Migrador CalamuchitAr -> Tags Directory

Este directorio contiene una herramienta de migración controlada. No altera las tablas históricas y comienza siempre en modo auditoría.

## Preparación

1. Revisar y ejecutar manualmente `database/migrations/2026-08-06-tags-directory-core.sql` en desarrollo.
2. Si el esquema base ya fue instalado, ejecutar `database/migrations/2026-08-08-tags-directory-global-taxonomy.sql` para convertir los rubros existentes en globales sin cambiar sus IDs.
3. Configurar las variables de origen y destino. Si ambos esquemas están en el mismo servidor pueden compartir host y credenciales, pero deben declararse de forma explícita.

```text
DIRECTORY_SOURCE_DB_HOST=
DIRECTORY_SOURCE_DB_PORT=3306
DIRECTORY_SOURCE_DB_USER=
DIRECTORY_SOURCE_DB_PASSWORD=
DIRECTORY_SOURCE_DB_NAME=

DIRECTORY_TARGET_DB_HOST=
DIRECTORY_TARGET_DB_PORT=3306
DIRECTORY_TARGET_DB_USER=
DIRECTORY_TARGET_DB_PASSWORD=
DIRECTORY_TARGET_DB_NAME=
```

## Auditoría segura

```text
node scripts/directory/migrate-calamuchitar.mjs
```

La auditoría verifica tablas, cantidades, referencias huérfanas, superposición de publishers y colisiones de rutas. En el esquema histórico la tabla de localidades se llama `locality`. No escribe datos.

## Aplicar solamente taxonomía y geografía

```text
$env:DIRECTORY_MIGRATION_CONFIRM=$env:DIRECTORY_TARGET_DB_NAME
node scripts/directory/migrate-calamuchitar.mjs --apply-taxonomy-geo
```

La operación usa una transacción, es idempotente y registra cada correspondencia histórica en `tags_legacy_entity_map`. No migra publishers ni fichas.

La migración de publishers permanece bloqueada hasta que la auditoría real de producción defina cómo unificar `publishers` y `publishers_ac`, qué registros crearán negocios y qué rutas históricas provienen del sitemap y Search Console.

## Aplicar fichas consolidadas en desarrollo

```text
$env:DIRECTORY_MIGRATION_CONFIRM=$env:DIRECTORY_TARGET_DB_NAME
node scripts/directory/migrate-calamuchitar.mjs --apply-publisher-listings
```

La selección prioriza `publishers_ac`. Crea fichas y publicaciones del Directorio con `business_id=NULL`; no crea negocios Tags, QR Pages ni addons. Los registros inactivos, Dummy o excluidos de CalamuchitAr quedan archivados y sin ruta pública activa.

No se deben crear QR Pages ni cambiar rutas públicas con esta herramienta inicial.

## Completar clientes Tags y catálogos históricos

`complete-calamuchitar-migration.mjs` continúa sobre las fichas ya migradas. Su modo predeterminado es siempre de solo lectura.

### 1. Auditoría

```powershell
node scripts/directory/complete-calamuchitar-migration.mjs --report=scripts/directory/reports/produccion-audit.json
```

El informe separa clientes que pueden crearse, coincidencias seguras, clientes ya vinculados y conflictos. No envía emails ni magic links.

Si hay conflictos, copiar `migration-resolutions.example.json` fuera del ejemplo y definir cada caso:

```json
{
  "businesses": {
    "publishers_ac:31": 24,
    "publishers_ac:32": "create"
  },
  "catalogs": {
    "catalogo@prestador.com.ar": {
      "mode": "directory_catalog",
      "businessId": 24,
      "sourcePublisherId": 5,
      "sourceSubscriptionId": 12
    }
  }
}
```

Un número vincula la ficha con un cliente Tags existente. `"create"` fuerza un cliente separado. No utilizar una resolución sin verificar previamente el prestador y el cliente destino.

### 2. Promover prestadores a clientes Tags

La migración de clientes gratuitos y webs históricas de CalamuchitAr incluye automáticamente todos los `dummy` y todos los publishers con web/catalogo histórico. La fuente de verdad de gratuidad es `publishers_ac.dummy=1`; no se utiliza `payment_status` para decidir gratuidad. Solo debe utilizarse `--all-publishers` para una auditoría especial fuera de este alcance.

```powershell
$env:DIRECTORY_MIGRATION_CONFIRM=$env:DIRECTORY_TARGET_DB_NAME
node scripts/directory/complete-calamuchitar-migration.mjs --apply-businesses --directory-addon=web --resolutions=scripts/directory/migration-resolutions.json --report=scripts/directory/reports/produccion-clientes.json
```

Para excluir un publisher de prueba sin borrar sus registros históricos, agregar `--exclude-publisher-ids=167`.

Políticas disponibles para el addon Directorio:

- `none`: no modifica asignaciones comerciales de addons.
- `paid`: lo asigna solamente a fichas históricas no gratuitas.
- `all`: lo asigna a todos los prestadores promovidos.
- `dummy`: lo activa para los prestadores seleccionados con `publishers_ac.dummy=1`.

Para esta migración la política es `dummy`: los clientes gratuitos con web histórica tendrán ficha gratuita y addon Directory activo. Los dummy sin web conservarán únicamente su ficha gratuita del Directorio.

### 3. Activar las Webs Directory migradas

La activación conserva la ruta histórica, crea la QR-Page Directory en borrador e importa logo y galería. No publica automáticamente.

```powershell
$env:DIRECTORY_MIGRATION_CONFIRM=$env:DIRECTORY_TARGET_DB_NAME
node scripts/directory/complete-calamuchitar-migration.mjs --activate-directory-pages --resolutions=scripts/directory/migration-resolutions.json --report=scripts/directory/reports/produccion-webs.json
```

El addon Directory se activa automáticamente durante `--apply-businesses --directory-addon=web`. Esta fase puede ejecutarse junto con esa promoción. La política `web` considera web histórica únicamente cuando el publisher tiene `site=1` o `name_site` informado; tener catálogo no activa una web.

### 4. Migrar catálogos con destino explícito

En Directory, el catálogo se importa únicamente como un bloque dentro de la Web/ficha del prestador. No crea una plantilla Catálogo completa, no cambia el renderer público y no reemplaza la ficha.

Ejecutar primero nuevamente la auditoría. Debe mostrar todos los propietarios de catálogo en `catalogs.owners` y ninguno en `catalogs.blocked`.

```powershell
$env:DIRECTORY_MIGRATION_CONFIRM=$env:DIRECTORY_TARGET_DB_NAME
node scripts/directory/complete-calamuchitar-migration.mjs --apply-catalogs --resolutions=scripts/directory/migration-resolutions.json --report=scripts/directory/reports/produccion-catalogos.json
```

Los productos de clientes `dummy=1` se destinan automáticamente al bloque Catálogo de su web. Los catálogos de clientes no dummy quedan omitidos por estar fuera de esta ejecución, salvo Sierras Energía Solar, que se detecta por su identidad histórica y se destina a su Store existente; el migrador nunca crea una Store nueva para este caso.

Cada propietario histórico no dummy o cada excepción debe tener una decisión en `catalogs`:

- `directory_catalog`: importa al bloque Catálogo de la Web Directory, con categorías propias y hasta 12 imágenes por producto;
- `store`: importa a una Store existente indicada obligatoriamente con `targetStoreId`;
- `skip`: excluye un registro verificado como prueba o descartado.

Los modos que migran contenido exigen además `sourcePublisherId` y `sourceSubscriptionId`. El proceso comprueba que la suscripción pertenezca al publisher y que `products.owner` coincida con el email histórico de ese publisher. Si cualquiera de las tres identidades difiere, bloquea la escritura.

Esta etapa:

- nunca crea una Store automáticamente;
- nunca reutiliza una Store solamente porque sea la única del cliente;
- nunca mezcla el catálogo con una tienda sin una resolución explícita;
- migra categorías, subcategorías, productos, precios, descuentos, imágenes, colores y tamaños;
- registra correspondencias idempotentes en `tags_legacy_entity_map`;
- no activa Mercado Pago ni envía notificaciones.

Para ensayos parciales pueden utilizarse `--publisher-ids=5,18` y `--catalog-owners=email1,email2`. Sin filtros se audita el universo completo.

La ejecución puede repetirse: los registros ya mapeados no se duplican. Los reportes deben conservarse junto con el respaldo y el registro operativo de la migración de producción.
