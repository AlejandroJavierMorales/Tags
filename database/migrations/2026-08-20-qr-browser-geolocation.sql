-- Habilita la pantalla intermedia y el permiso de ubicación por QR.
-- Ejecutar una sola vez en cada base antes de desplegar el código.
SET @has_qr_browser_geo := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tags_qr_codes'
    AND COLUMN_NAME = 'browser_geolocation_enabled'
);
SET @qr_browser_geo_sql := IF(
  @has_qr_browser_geo = 0,
  'ALTER TABLE tags_qr_codes ADD COLUMN browser_geolocation_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER tracking_enabled',
  'SELECT 1'
);
PREPARE qr_browser_geo_stmt FROM @qr_browser_geo_sql;
EXECUTE qr_browser_geo_stmt;
DEALLOCATE PREPARE qr_browser_geo_stmt;
