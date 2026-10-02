-- Tags Directorio - Puntos QR territoriales configurables
-- Fecha: 2026-09-28
--
-- Migración ADITIVA e idempotente.
-- No crea puntos, QRs ni modifica estadísticas existentes.
-- Compatible con MySQL 8 y MariaDB 10.11.
--
-- Las referencias a tablas legacy se mantienen indexadas pero sin FK porque
-- sus tipos difieren entre instalaciones. Las FK se limitan a tablas nuevas.

CREATE TABLE IF NOT EXISTS tags_directory_point_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  owner_business_id BIGINT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(190) NOT NULL,
  description VARCHAR(1000) NULL,
  number_prefix VARCHAR(30) NULL,
  color_hex CHAR(7) NOT NULL DEFAULT '#ef7d22',
  marker_icon_url VARCHAR(2000) NULL,
  default_destination_url VARCHAR(2000) NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_directory_point_type_code (site_id,code),
  KEY idx_directory_point_type_site (site_id,is_active,sort_order),
  KEY idx_directory_point_type_owner (owner_business_id,is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_directory_points (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  point_type_id BIGINT UNSIGNED NOT NULL,
  qr_code_id BIGINT NULL,
  public_key VARCHAR(40) NOT NULL,
  point_number VARCHAR(80) NOT NULL,
  display_name VARCHAR(190) NULL,
  host_business_id BIGINT NULL,
  host_name VARCHAR(190) NULL,
  host_contact_name VARCHAR(190) NULL,
  host_phone VARCHAR(80) NULL,
  permission_status ENUM('pending','authorized','denied','revoked') NOT NULL DEFAULT 'pending',
  permission_requested_at DATETIME NULL,
  permission_granted_at DATETIME NULL,
  installation_status ENUM('planned','authorized','installed','maintenance','retired') NOT NULL DEFAULT 'planned',
  installed_at DATETIME NULL,
  retired_at DATETIME NULL,
  locality_place_id BIGINT UNSIGNED NULL,
  locality_name VARCHAR(190) NULL,
  address VARCHAR(500) NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  location_accuracy_m DECIMAL(10,2) NULL,
  destination_url VARCHAR(2000) NULL,
  primary_photo_url VARCHAR(2000) NOT NULL,
  primary_photo_storage_path VARCHAR(2000) NULL,
  notes TEXT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_by_id BIGINT NULL,
  updated_by_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_directory_point_public_key (public_key),
  UNIQUE KEY uq_directory_point_number (site_id,point_type_id,point_number),
  KEY idx_directory_point_qr (qr_code_id),
  KEY idx_directory_point_site (site_id,installation_status,is_public),
  KEY idx_directory_point_type (point_type_id,installation_status),
  KEY idx_directory_point_locality (locality_place_id,installation_status),
  KEY idx_directory_point_host (host_business_id),
  KEY idx_directory_point_geo (latitude,longitude),
  CONSTRAINT fk_directory_point_type
    FOREIGN KEY (point_type_id) REFERENCES tags_directory_point_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_directory_point_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  point_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(2000) NOT NULL,
  storage_path VARCHAR(2000) NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  size_bytes BIGINT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_directory_point_photo (point_id,sort_order,id),
  CONSTRAINT fk_directory_point_photo_point
    FOREIGN KEY (point_id) REFERENCES tags_directory_points(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tipos iniciales solamente para CalamuchitAr. Otros Directorios pueden crear
-- sus propios tipos desde la administración.
INSERT INTO tags_directory_point_types
  (site_id,owner_business_id,code,name,description,number_prefix,color_hex,marker_icon_url,default_destination_url,is_public,is_active,sort_order)
SELECT
  s.id,NULL,'muchi','Puntos Muchi',
  'Carteles QR de Muchi instalados en comercios y espacios del Valle.',
  'MUCHI','#ef7d22','/assets/destination-ai/muchi/icons/muchi-icon-192.png',
  'https://muchi.calamuchita.ar/',1,1,10
FROM tags_directory_sites s
WHERE s.code='calamuchitar'
  AND NOT EXISTS (
    SELECT 1 FROM tags_directory_point_types t
    WHERE t.site_id=s.id AND t.code='muchi'
  );

INSERT INTO tags_directory_point_types
  (site_id,owner_business_id,code,name,description,number_prefix,color_hex,marker_icon_url,default_destination_url,is_public,is_active,sort_order)
SELECT
  s.id,NULL,'calamuchitar','Puntos CalamuchitAr',
  'Carteles QR de CalamuchitAr instalados en comercios y espacios del Valle.',
  'CALAMUCHITAR','#2f7958','/directory/calamuchitar/footer/logo_calamuchitar_redondo_200x200.png',
  'https://calamuchita.ar/',1,1,20
FROM tags_directory_sites s
WHERE s.code='calamuchitar'
  AND NOT EXISTS (
    SELECT 1 FROM tags_directory_point_types t
    WHERE t.site_id=s.id AND t.code='calamuchitar'
  );
