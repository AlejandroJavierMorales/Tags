-- Tags Destination - nucleo territorial para corredores turisticos
-- Fecha: 2026-11-01
-- Estado: PREPARADA, NO EJECUTADA.
--
-- Migracion aditiva compatible con MySQL 8 y MariaDB 10.11.
-- No altera ni elimina tablas o datos existentes.
-- No carga Ruta 100, localidades, experiencias, tramos ni geometrías.
--
-- IMPORTANTE ANTES DE EJECUTAR EN CADA ENTORNO:
-- SHOW CREATE TABLE tags_directory_sites;
-- SHOW CREATE TABLE tags_geo_places;
-- SHOW CREATE TABLE tags_ai_tourism_sources;
-- SHOW CREATE TABLE tags_ai_tourism_contents;
--
-- Se espera que los identificadores referenciados sean BIGINT UNSIGNED y
-- las tablas utilicen InnoDB. Por seguridad no se declaran FK contra estas
-- tablas preexistentes. La aplicacion validara esas relaciones dentro de
-- transacciones. Las FK incluidas relacionan solamente tablas nuevas.

CREATE TABLE IF NOT EXISTS tags_destination_corridors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  name VARCHAR(190) NOT NULL,
  eyebrow VARCHAR(190) NULL,
  summary VARCHAR(1000) NULL,
  description MEDIUMTEXT NULL,
  start_place_id BIGINT UNSIGNED NULL,
  end_place_id BIGINT UNSIGNED NULL,
  distance_km DECIMAL(9,2) NULL,
  geometry_json JSON NULL,
  bounds_json JSON NULL,
  source_id BIGINT UNSIGNED NULL,
  source_url VARCHAR(2000) NULL,
  source_checked_at DATE NULL,
  status ENUM('draft','in_review','observed','published','hidden','archived') NOT NULL DEFAULT 'draft',
  created_by_id BIGINT NULL,
  updated_by_id BIGINT NULL,
  reviewed_by_id BIGINT NULL,
  reviewed_at DATETIME NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_destination_corridor_code (site_id,code),
  UNIQUE KEY uq_destination_corridor_slug (site_id,slug),
  KEY idx_destination_corridor_public (site_id,status),
  KEY idx_destination_corridor_places (start_place_id,end_place_id),
  KEY idx_destination_corridor_source (source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_destination_segments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  corridor_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  name VARCHAR(190) NOT NULL,
  summary VARCHAR(1000) NULL,
  description MEDIUMTEXT NULL,
  start_place_id BIGINT UNSIGNED NULL,
  end_place_id BIGINT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  distance_km DECIMAL(9,2) NULL,
  estimated_minutes INT UNSIGNED NULL,
  geometry_json JSON NULL,
  bounds_json JSON NULL,
  road_info_json JSON NULL,
  practical_json JSON NULL,
  source_id BIGINT UNSIGNED NULL,
  source_url VARCHAR(2000) NULL,
  source_checked_at DATE NULL,
  status ENUM('draft','in_review','observed','published','hidden','archived') NOT NULL DEFAULT 'draft',
  created_by_id BIGINT NULL,
  updated_by_id BIGINT NULL,
  reviewed_by_id BIGINT NULL,
  reviewed_at DATETIME NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_destination_segment_code (corridor_id,code),
  UNIQUE KEY uq_destination_segment_slug (corridor_id,slug),
  KEY idx_destination_segment_public (corridor_id,status,sort_order),
  KEY idx_destination_segment_places (start_place_id,end_place_id),
  KEY idx_destination_segment_source (source_id),
  CONSTRAINT fk_destination_segment_corridor
    FOREIGN KEY (corridor_id) REFERENCES tags_destination_corridors(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_destination_segment_places (
  segment_id BIGINT UNSIGNED NOT NULL,
  place_id BIGINT UNSIGNED NOT NULL,
  relation_type ENUM('start','through','stop','end','nearby') NOT NULL DEFAULT 'through',
  sort_order INT NOT NULL DEFAULT 0,
  distance_from_start_km DECIMAL(9,2) NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  notes VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (segment_id,place_id,relation_type),
  KEY idx_destination_segment_place_order (segment_id,sort_order),
  KEY idx_destination_segment_place_lookup (place_id,relation_type),
  CONSTRAINT fk_destination_segment_place_segment
    FOREIGN KEY (segment_id) REFERENCES tags_destination_segments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_destination_place_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  place_id BIGINT UNSIGNED NOT NULL,
  public_slug VARCHAR(190) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary VARCHAR(1000) NULL,
  description MEDIUMTEXT NULL,
  history_text MEDIUMTEXT NULL,
  practical_json JSON NULL,
  cover_image_url VARCHAR(2000) NULL,
  images_json JSON NULL,
  seo_title VARCHAR(255) NULL,
  seo_description VARCHAR(500) NULL,
  is_emerging_destination TINYINT(1) NOT NULL DEFAULT 0,
  is_on_corridor TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  source_id BIGINT UNSIGNED NULL,
  source_url VARCHAR(2000) NULL,
  source_checked_at DATE NULL,
  status ENUM('draft','in_review','observed','published','hidden','archived') NOT NULL DEFAULT 'draft',
  created_by_id BIGINT NULL,
  updated_by_id BIGINT NULL,
  reviewed_by_id BIGINT NULL,
  reviewed_at DATETIME NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_destination_place_profile (site_id,place_id),
  UNIQUE KEY uq_destination_place_slug (site_id,public_slug),
  KEY idx_destination_place_public (site_id,status,sort_order),
  KEY idx_destination_place_corridor (site_id,is_on_corridor,status),
  KEY idx_destination_place_source (source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_destination_experiences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  name VARCHAR(190) NOT NULL,
  short_name VARCHAR(120) NULL,
  summary VARCHAR(1000) NULL,
  description MEDIUMTEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  icon_url VARCHAR(2000) NULL,
  cover_image_url VARCHAR(2000) NULL,
  theme_json JSON NULL,
  practical_json JSON NULL,
  seo_title VARCHAR(255) NULL,
  seo_description VARCHAR(500) NULL,
  source_id BIGINT UNSIGNED NULL,
  source_url VARCHAR(2000) NULL,
  source_checked_at DATE NULL,
  status ENUM('draft','in_review','observed','published','hidden','archived') NOT NULL DEFAULT 'draft',
  created_by_id BIGINT NULL,
  updated_by_id BIGINT NULL,
  reviewed_by_id BIGINT NULL,
  reviewed_at DATETIME NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_destination_experience_code (site_id,code),
  UNIQUE KEY uq_destination_experience_slug (site_id,slug),
  KEY idx_destination_experience_public (site_id,status,sort_order),
  KEY idx_destination_experience_source (source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_destination_experience_contents (
  experience_id BIGINT UNSIGNED NOT NULL,
  content_id BIGINT UNSIGNED NOT NULL,
  relation_type ENUM('primary','related','recommended') NOT NULL DEFAULT 'related',
  sort_order INT NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (experience_id,content_id),
  KEY idx_destination_experience_content_order (experience_id,sort_order),
  KEY idx_destination_experience_content_lookup (content_id),
  CONSTRAINT fk_destination_experience_content_experience
    FOREIGN KEY (experience_id) REFERENCES tags_destination_experiences(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_destination_experience_places (
  experience_id BIGINT UNSIGNED NOT NULL,
  place_id BIGINT UNSIGNED NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (experience_id,place_id),
  KEY idx_destination_experience_place_order (experience_id,sort_order),
  KEY idx_destination_experience_place_lookup (place_id),
  CONSTRAINT fk_destination_experience_place_experience
    FOREIGN KEY (experience_id) REFERENCES tags_destination_experiences(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_destination_experience_segments (
  experience_id BIGINT UNSIGNED NOT NULL,
  segment_id BIGINT UNSIGNED NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (experience_id,segment_id),
  KEY idx_destination_experience_segment_order (experience_id,sort_order),
  KEY idx_destination_experience_segment_lookup (segment_id),
  CONSTRAINT fk_destination_experience_segment_experience
    FOREIGN KEY (experience_id) REFERENCES tags_destination_experiences(id) ON DELETE CASCADE,
  CONSTRAINT fk_destination_experience_segment_segment
    FOREIGN KEY (segment_id) REFERENCES tags_destination_segments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_destination_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  actor_type VARCHAR(40) NOT NULL DEFAULT 'directory_admin',
  actor_id BIGINT NULL,
  summary VARCHAR(1000) NULL,
  changes_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_destination_audit_entity (site_id,entity_type,entity_id,created_at),
  KEY idx_destination_audit_actor (actor_type,actor_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificacion posterior. Estas consultas no modifican datos.
SHOW TABLES LIKE 'tags_destination_%';
SHOW CREATE TABLE tags_destination_corridors;
SHOW CREATE TABLE tags_destination_segments;
SHOW CREATE TABLE tags_destination_place_profiles;
SHOW CREATE TABLE tags_destination_experiences;

SELECT
  (SELECT COUNT(*) FROM tags_destination_corridors) AS corridors,
  (SELECT COUNT(*) FROM tags_destination_segments) AS segments,
  (SELECT COUNT(*) FROM tags_destination_place_profiles) AS place_profiles,
  (SELECT COUNT(*) FROM tags_destination_experiences) AS experiences;

-- Rollback condicionado y DESTRUCTIVO. No ejecutar si existe informacion
-- que deba conservarse. El orden correcto seria el siguiente:
-- DROP TABLE tags_destination_audit_log;
-- DROP TABLE tags_destination_experience_segments;
-- DROP TABLE tags_destination_experience_places;
-- DROP TABLE tags_destination_experience_contents;
-- DROP TABLE tags_destination_experiences;
-- DROP TABLE tags_destination_place_profiles;
-- DROP TABLE tags_destination_segment_places;
-- DROP TABLE tags_destination_segments;
-- DROP TABLE tags_destination_corridors;

