-- Capacidad de productos asignada por la administración de la plataforma.
-- Ejecutar una sola vez en cada base de datos.
ALTER TABLE tags_qr_pages
  ADD COLUMN catalog_product_limit INT UNSIGNED NOT NULL DEFAULT 50 AFTER page_type;

UPDATE tags_qr_pages
SET catalog_product_limit=50
WHERE id>0 AND (catalog_product_limit IS NULL OR catalog_product_limit<1);

SELECT id,business_id,slug,page_type,catalog_product_limit
FROM tags_qr_pages
WHERE page_type='directory'
ORDER BY id DESC;
