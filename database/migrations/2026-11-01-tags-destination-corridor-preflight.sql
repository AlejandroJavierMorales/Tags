-- Ruta 100 / Tags Destination - prevalidacion de produccion
-- SOLO LECTURA: no crea, altera ni elimina datos.
-- Ejecutar completo en la base de produccion desde phpMyAdmin.

SELECT VERSION() AS database_version, DATABASE() AS database_name;

SELECT
  TABLE_NAME,
  ENGINE,
  TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'tags_directory_sites',
    'tags_geo_places',
    'tags_ai_tourism_sources',
    'tags_ai_tourism_contents'
  )
ORDER BY TABLE_NAME;

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_KEY,
  EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'tags_directory_sites' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME = 'tags_geo_places' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME = 'tags_ai_tourism_sources' AND COLUMN_NAME IN ('id','site_id','locality_id'))
    OR (TABLE_NAME = 'tags_ai_tourism_contents' AND COLUMN_NAME IN ('id','site_id','source_id','locality_id'))
  )
ORDER BY TABLE_NAME,ORDINAL_POSITION;

SHOW CREATE TABLE tags_directory_sites;
SHOW CREATE TABLE tags_geo_places;
SHOW CREATE TABLE tags_ai_tourism_sources;
SHOW CREATE TABLE tags_ai_tourism_contents;

-- Confirma que la migracion territorial todavia no fue ejecutada o permite
-- detectar una instalacion parcial antes de continuar.
SELECT
  TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME LIKE 'tags\_destination\_%' ESCAPE '\\'
ORDER BY TABLE_NAME;

