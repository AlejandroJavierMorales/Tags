-- Tags Directory Network - modalidad gratuita/paga por canal
-- Fecha: 2026-08-06

SET @directory_has_is_free := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='tags_directory_site_listings'
    AND COLUMN_NAME='is_free'
);

SET @directory_add_is_free := IF(
  @directory_has_is_free=0,
  'ALTER TABLE tags_directory_site_listings ADD COLUMN is_free TINYINT(1) NOT NULL DEFAULT 1 AFTER publication_status, ADD KEY idx_directory_site_free (site_id,is_free,publication_status)',
  'SELECT 1'
);

PREPARE directory_stmt FROM @directory_add_is_free;
EXECUTE directory_stmt;
DEALLOCATE PREPARE directory_stmt;

UPDATE tags_directory_site_listings sl
INNER JOIN tags_legacy_entity_map em
  ON em.target_table='tags_directory_site_listings'
 AND em.target_id=sl.id
 AND em.source_system='calamuchitar'
LEFT JOIN publishers_ac pa
  ON em.source_table='publishers_ac'
 AND pa.id=CAST(em.source_id AS UNSIGNED)
LEFT JOIN publishers p
  ON em.source_table='publishers'
 AND p.id=CAST(em.source_id AS UNSIGNED)
SET sl.is_free=IF(
  COALESCE(pa.site,p.site,0)=1
  OR NULLIF(TRIM(COALESCE(pa.name_site,p.name_site,'')),'') IS NOT NULL,
  0,
  1
);
