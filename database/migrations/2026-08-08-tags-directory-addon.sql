-- Tags Directory - addon y vínculo de la ficha con su única QR-Page/Web
-- Fecha: 2026-08-08
-- Ejecutar manualmente en desarrollo después de revisar.

INSERT INTO tags_addons (code,name,description,addon_type,page_type,default_quantity,price,currency,is_active,is_public,sort_order,created_at)
VALUES ('directory','Tags Directorio','Web del prestador publicada en uno o varios directorios.','page','directory',1,0,'ARS',1,1,5,NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),addon_type=VALUES(addon_type),page_type=VALUES(page_type),is_active=1,is_public=1;

SET @directory_has_qr_page_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tags_directory_listings' AND COLUMN_NAME='qr_page_id'
);
SET @directory_add_qr_page_id := IF(
  @directory_has_qr_page_id=0,
  'ALTER TABLE tags_directory_listings ADD COLUMN qr_page_id INT NULL AFTER business_id, ADD UNIQUE KEY uq_directory_listing_qr_page (qr_page_id), ADD CONSTRAINT fk_directory_listing_qr_page FOREIGN KEY (qr_page_id) REFERENCES tags_qr_pages(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE directory_stmt FROM @directory_add_qr_page_id;
EXECUTE directory_stmt;
DEALLOCATE PREPARE directory_stmt;
