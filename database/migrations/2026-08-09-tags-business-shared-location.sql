-- Tags - ubicación geográfica compartida del negocio
-- Fecha: 2026-08-09
-- Fuente maestra para Directory y futuros addons. No elimina datos existentes.

CREATE TABLE IF NOT EXISTS tags_business_places (
  business_id INT UNSIGNED NOT NULL,
  place_id BIGINT UNSIGNED NOT NULL,
  relation_type ENUM('location','service_area') NOT NULL DEFAULT 'location',
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (business_id,place_id,relation_type),
  KEY idx_business_places_place (place_id,relation_type,is_primary),
  KEY idx_business_places_business (business_id,relation_type,is_primary),
  CONSTRAINT fk_business_places_business FOREIGN KEY (business_id) REFERENCES tags_businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_business_places_place FOREIGN KEY (place_id) REFERENCES tags_geo_places(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @business_postal_code_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tags_businesses' AND COLUMN_NAME='postal_code'
);
SET @business_postal_code_sql := IF(
  @business_postal_code_exists=0,
  'ALTER TABLE tags_businesses ADD COLUMN postal_code VARCHAR(32) NULL AFTER address',
  'SELECT 1'
);
PREPARE business_location_stmt FROM @business_postal_code_sql;
EXECUTE business_location_stmt;
DEALLOCATE PREPARE business_location_stmt;

SET @business_latitude_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tags_businesses' AND COLUMN_NAME='latitude'
);
SET @business_latitude_sql := IF(
  @business_latitude_exists=0,
  'ALTER TABLE tags_businesses ADD COLUMN latitude DECIMAL(10,7) NULL AFTER postal_code',
  'SELECT 1'
);
PREPARE business_location_stmt FROM @business_latitude_sql;
EXECUTE business_location_stmt;
DEALLOCATE PREPARE business_location_stmt;

SET @business_longitude_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tags_businesses' AND COLUMN_NAME='longitude'
);
SET @business_longitude_sql := IF(
  @business_longitude_exists=0,
  'ALTER TABLE tags_businesses ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude',
  'SELECT 1'
);
PREPARE business_location_stmt FROM @business_longitude_sql;
EXECUTE business_location_stmt;
DEALLOCATE PREPARE business_location_stmt;

-- Promueve las ubicaciones ya verificadas en Directory al perfil maestro.
INSERT INTO tags_business_places (business_id,place_id,relation_type,is_primary)
SELECT DISTINCT l.business_id,lp.place_id,lp.relation_type,lp.is_primary
FROM tags_directory_listings l
INNER JOIN tags_directory_listing_places lp ON lp.listing_id=l.id
WHERE l.business_id IS NOT NULL
ON DUPLICATE KEY UPDATE is_primary=VALUES(is_primary),updated_at=CURRENT_TIMESTAMP;

-- Conserva coordenadas existentes de las fichas como coordenadas canónicas.
UPDATE tags_businesses b
INNER JOIN tags_directory_listings l ON l.business_id=b.id
SET b.latitude=COALESCE(b.latitude,l.latitude),
    b.longitude=COALESCE(b.longitude,l.longitude)
WHERE b.latitude IS NULL OR b.longitude IS NULL;
