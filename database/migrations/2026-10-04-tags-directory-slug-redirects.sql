-- Conserva las URLs publicas anteriores de las fichas de Directorio.
-- La URL de destino no se duplica: siempre se resuelve contra el slug vigente
-- de la ficha, evitando cadenas cuando una web cambia de nombre varias veces.

CREATE TABLE IF NOT EXISTS tags_directory_slug_redirects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  old_slug VARCHAR(190) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_directory_slug_redirect_site_old (site_id,old_slug),
  KEY idx_tags_directory_slug_redirect_listing (listing_id),
  KEY idx_tags_directory_slug_redirect_site_listing (site_id,listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SHOW TABLES LIKE 'tags_directory_slug_redirects';
