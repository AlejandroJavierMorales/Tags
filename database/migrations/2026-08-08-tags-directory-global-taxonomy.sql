-- Tags Directory - rubros globales y transversales a todos los Directorios
-- Fecha: 2026-08-08
-- Compatible con 2026-08-06-tags-directory-core.sql ya ejecutado.
-- No elimina rubros, relaciones, fichas ni rutas historicas.

SET @directory_taxonomy_site_nullable := (
  SELECT IS_NULLABLE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='tags_directory_taxonomy_nodes'
    AND COLUMN_NAME='site_id'
  LIMIT 1
);

SET @directory_taxonomy_site_fk := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='tags_directory_taxonomy_nodes'
    AND COLUMN_NAME='site_id'
    AND REFERENCED_TABLE_NAME='tags_directory_sites'
  LIMIT 1
);

SET @directory_drop_site_fk := IF(
  @directory_taxonomy_site_nullable='NO' AND @directory_taxonomy_site_fk IS NOT NULL,
  CONCAT('ALTER TABLE tags_directory_taxonomy_nodes DROP FOREIGN KEY `',REPLACE(@directory_taxonomy_site_fk,'`','``'),'`'),
  'SELECT 1'
);
PREPARE directory_taxonomy_stmt FROM @directory_drop_site_fk;
EXECUTE directory_taxonomy_stmt;
DEALLOCATE PREPARE directory_taxonomy_stmt;

SET @directory_make_site_nullable := IF(
  @directory_taxonomy_site_nullable='NO',
  'ALTER TABLE tags_directory_taxonomy_nodes MODIFY COLUMN site_id BIGINT UNSIGNED NULL',
  'SELECT 1'
);
PREPARE directory_taxonomy_stmt FROM @directory_make_site_nullable;
EXECUTE directory_taxonomy_stmt;
DEALLOCATE PREPARE directory_taxonomy_stmt;

SET @directory_taxonomy_site_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='tags_directory_taxonomy_nodes'
    AND COLUMN_NAME='site_id'
    AND REFERENCED_TABLE_NAME='tags_directory_sites'
);
SET @directory_restore_site_fk := IF(
  @directory_taxonomy_site_fk_exists=0,
  'ALTER TABLE tags_directory_taxonomy_nodes ADD CONSTRAINT fk_directory_taxonomy_site FOREIGN KEY (site_id) REFERENCES tags_directory_sites(id)',
  'SELECT 1'
);
PREPARE directory_taxonomy_stmt FROM @directory_restore_site_fk;
EXECUTE directory_taxonomy_stmt;
DEALLOCATE PREPARE directory_taxonomy_stmt;

-- site_id queda solamente como columna historica compatible. NULL significa rubro global.
UPDATE tags_directory_taxonomy_nodes SET site_id=NULL WHERE site_id IS NOT NULL;

SET @directory_global_tree_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='tags_directory_taxonomy_nodes'
    AND INDEX_NAME='idx_directory_taxonomy_global_tree'
);
SET @directory_add_global_tree_index := IF(
  @directory_global_tree_index=0,
  'ALTER TABLE tags_directory_taxonomy_nodes ADD KEY idx_directory_taxonomy_global_tree (parent_id,is_active,sort_order)',
  'SELECT 1'
);
PREPARE directory_taxonomy_stmt FROM @directory_add_global_tree_index;
EXECUTE directory_taxonomy_stmt;
DEALLOCATE PREPARE directory_taxonomy_stmt;
