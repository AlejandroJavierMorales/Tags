-- Tags Directorio - atribucion de escaneos a puntos fisicos
-- Fecha: 2026-09-28
--
-- Migracion ADITIVA e idempotente.
-- No modifica tags_clicks ni elimina estadisticas existentes.
-- No usa claves foraneas contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_directory_point_scans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  click_id BIGINT NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  qr_code_id BIGINT NOT NULL,
  point_id BIGINT UNSIGNED NULL,
  attribution_method ENUM('unique_qr','geolocation','printed_code','unattributed') NOT NULL DEFAULT 'unattributed',
  attribution_status ENUM('pending','matched','declined','unavailable','out_of_range','ambiguous','invalid_code') NOT NULL DEFAULT 'pending',
  distance_m DECIMAL(10,2) NULL,
  location_accuracy_m DECIMAL(10,2) NULL,
  printed_suffix CHAR(3) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_directory_point_scan_click (click_id),
  KEY idx_directory_point_scan_site_date (site_id,created_at),
  KEY idx_directory_point_scan_qr_date (qr_code_id,created_at),
  KEY idx_directory_point_scan_point_date (point_id,created_at),
  KEY idx_directory_point_scan_status (site_id,attribution_status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
