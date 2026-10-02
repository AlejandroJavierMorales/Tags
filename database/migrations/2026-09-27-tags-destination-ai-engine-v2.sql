-- Muchi / Tags Destination AI - motor estructurado v2.
-- Migración ADITIVA e idempotente. No elimina ni modifica el índice documental v1.
-- Ejecutar manualmente primero en desarrollo y luego en producción.
-- No se declaran FKs contra tablas legacy porque sus tipos difieren entre instalaciones.

CREATE TABLE IF NOT EXISTS tags_ai_search_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT NULL,
  canonical_key VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  offer_text MEDIUMTEXT NULL,
  locality_id BIGINT UNSIGNED NULL,
  locality_name VARCHAR(190) NULL,
  address VARCHAR(500) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  public_url VARCHAR(2000) NULL,
  phone VARCHAR(80) NULL,
  whatsapp VARCHAR(80) NULL,
  website_url VARCHAR(2000) NULL,
  primary_image_url VARCHAR(2000) NULL,
  relationship ENUM('free','subscriber') NOT NULL DEFAULT 'free',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  visibility ENUM('public','hidden','stale','rejected') NOT NULL DEFAULT 'public',
  quality_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  source_updated_at DATETIME NULL,
  source_hash CHAR(64) NOT NULL,
  indexed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_search_location_site_listing (site_id,listing_id),
  UNIQUE KEY uq_ai_search_location_key (site_id,canonical_key),
  KEY idx_ai_search_location_public (site_id,visibility,locality_id),
  KEY idx_ai_search_location_business (business_id,visibility),
  KEY idx_ai_search_location_geo (latitude,longitude),
  FULLTEXT KEY ftx_ai_search_location_text (name,summary,offer_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_search_location_categories (
  site_id BIGINT UNSIGNED NOT NULL,
  search_location_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  taxonomy_node_id BIGINT UNSIGNED NOT NULL,
  assignment_status ENUM('declared','confirmed','rejected') NOT NULL DEFAULT 'declared',
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  source_type VARCHAR(40) NOT NULL DEFAULT 'directory',
  reviewed_by_type VARCHAR(30) NULL,
  reviewed_by_id BIGINT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id,search_location_id,taxonomy_node_id),
  KEY idx_ai_location_category_lookup (site_id,taxonomy_node_id,assignment_status),
  KEY idx_ai_location_category_listing (listing_id,assignment_status),
  CONSTRAINT fk_ai_location_category_projection FOREIGN KEY (search_location_id)
    REFERENCES tags_ai_search_locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_search_location_places (
  site_id BIGINT UNSIGNED NOT NULL,
  search_location_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  place_id BIGINT UNSIGNED NOT NULL,
  relation_type ENUM('location','service_area') NOT NULL DEFAULT 'location',
  place_name VARCHAR(190) NOT NULL,
  normalized_name VARCHAR(190) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id,search_location_id,place_id,relation_type),
  KEY idx_ai_location_place_lookup (site_id,normalized_name,relation_type),
  CONSTRAINT fk_ai_location_place_projection FOREIGN KEY (search_location_id)
    REFERENCES tags_ai_search_locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_search_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  search_location_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT NULL,
  item_type ENUM('product','dish','service','experience') NOT NULL,
  source_type VARCHAR(80) NOT NULL,
  source_id VARCHAR(190) NOT NULL,
  canonical_key VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description MEDIUMTEXT NULL,
  category_text VARCHAR(500) NULL,
  searchable_text MEDIUMTEXT NOT NULL,
  price DECIMAL(12,2) NULL,
  sale_price DECIMAL(12,2) NULL,
  currency VARCHAR(10) NULL,
  stock_status ENUM('unknown','available','unavailable') NOT NULL DEFAULT 'unknown',
  public_url VARCHAR(2000) NULL,
  primary_image_url VARCHAR(2000) NULL,
  attributes_json JSON NULL,
  visibility ENUM('public','hidden','stale','rejected') NOT NULL DEFAULT 'public',
  verification_status ENUM('structured','business_confirmed','editor_confirmed','rejected') NOT NULL DEFAULT 'structured',
  source_updated_at DATETIME NULL,
  source_hash CHAR(64) NOT NULL,
  indexed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_search_item_key (site_id,canonical_key),
  KEY idx_ai_search_item_type (site_id,item_type,visibility),
  KEY idx_ai_search_item_location (search_location_id,visibility),
  KEY idx_ai_search_item_business (business_id,item_type,visibility),
  FULLTEXT KEY ftx_ai_search_item_text (name,category_text,searchable_text),
  CONSTRAINT fk_ai_search_item_location FOREIGN KEY (search_location_id)
    REFERENCES tags_ai_search_locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_search_item_categories (
  site_id BIGINT UNSIGNED NOT NULL,
  search_item_id BIGINT UNSIGNED NOT NULL,
  taxonomy_node_id BIGINT UNSIGNED NOT NULL,
  source_type VARCHAR(40) NOT NULL DEFAULT 'editorial',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id,search_item_id,taxonomy_node_id),
  KEY idx_ai_item_category_lookup (site_id,taxonomy_node_id),
  CONSTRAINT fk_ai_item_category_projection FOREIGN KEY (search_item_id)
    REFERENCES tags_ai_search_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_taxonomy_aliases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  taxonomy_node_id BIGINT UNSIGNED NOT NULL,
  alias_value VARCHAR(190) NOT NULL,
  normalized_alias VARCHAR(190) NOT NULL,
  context_type ENUM('all','business','product','dish','service','tourism') NOT NULL DEFAULT 'all',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  source_type VARCHAR(30) NOT NULL DEFAULT 'editorial',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_taxonomy_alias (site_id,taxonomy_node_id,normalized_alias,context_type),
  KEY idx_ai_taxonomy_alias_lookup (site_id,normalized_alias,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_tourism_sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT NULL,
  name VARCHAR(255) NOT NULL,
  source_kind ENUM('municipality','tourism_office','directory_editorial','provider','other') NOT NULL,
  locality_id BIGINT UNSIGNED NULL,
  locality_name VARCHAR(190) NULL,
  website_url VARCHAR(2000) NULL,
  contact_json JSON NULL,
  status ENUM('draft','active','inactive') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_tourism_source_site (site_id,status,source_kind),
  KEY idx_ai_tourism_source_business (business_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_tourism_contents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  content_type ENUM('attraction','walk','experience','excursion','event','beach','river_access','viewpoint','museum','route','public_service','recommendation','other') NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  summary VARCHAR(1000) NULL,
  description MEDIUMTEXT NULL,
  audience_json JSON NULL,
  conditions_json JSON NULL,
  availability_json JSON NULL,
  locality_id BIGINT UNSIGNED NULL,
  locality_name VARCHAR(190) NULL,
  address VARCHAR(500) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  public_url VARCHAR(2000) NULL,
  primary_image_url VARCHAR(2000) NULL,
  images_json JSON NULL,
  status ENUM('draft','in_review','published','hidden','archived') NOT NULL DEFAULT 'draft',
  verification_status ENUM('editorial','source_confirmed','expired') NOT NULL DEFAULT 'editorial',
  valid_from DATETIME NULL,
  valid_until DATETIME NULL,
  searchable_text MEDIUMTEXT NOT NULL,
  created_by_id BIGINT NULL,
  reviewed_by_id BIGINT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_tourism_content_slug (site_id,slug),
  KEY idx_ai_tourism_content_public (site_id,status,content_type,locality_id),
  KEY idx_ai_tourism_content_geo (latitude,longitude),
  FULLTEXT KEY ftx_ai_tourism_content_text (title,summary,searchable_text),
  CONSTRAINT fk_ai_tourism_content_source FOREIGN KEY (source_id)
    REFERENCES tags_ai_tourism_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_tourism_content_categories (
  site_id BIGINT UNSIGNED NOT NULL,
  content_id BIGINT UNSIGNED NOT NULL,
  taxonomy_node_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id,content_id,taxonomy_node_id),
  KEY idx_ai_tourism_category_lookup (site_id,taxonomy_node_id),
  CONSTRAINT fk_ai_tourism_category_content FOREIGN KEY (content_id)
    REFERENCES tags_ai_tourism_contents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_tourism_imports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  source_id BIGINT UNSIGNED NULL,
  template_version VARCHAR(30) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_hash CHAR(64) NOT NULL,
  mode ENUM('preview','commit') NOT NULL DEFAULT 'preview',
  status ENUM('pending','validated','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  total_rows INT UNSIGNED NOT NULL DEFAULT 0,
  valid_rows INT UNSIGNED NOT NULL DEFAULT 0,
  error_rows INT UNSIGNED NOT NULL DEFAULT 0,
  report_json JSON NULL,
  created_by_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_ai_tourism_import_site (site_id,status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_search_evaluations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(190) NOT NULL,
  mode ENUM('tourist','resident','unselected') NOT NULL DEFAULT 'unselected',
  query_text VARCHAR(1000) NOT NULL,
  expected_task_type VARCHAR(40) NULL,
  expected_taxonomy_json JSON NULL,
  expected_listing_ids_json JSON NULL,
  forbidden_listing_ids_json JSON NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_evaluation_site (site_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Límite geográfico del canal. El motor no usa coordenadas externas a esta caja
-- para distancias ni mapa, aunque conserva la ficha pública para su corrección.
UPDATE tags_directory_sites
   SET directory_config=JSON_SET(
     COALESCE(directory_config,JSON_OBJECT()),
     '$.geographicBounds',JSON_OBJECT('south',-33.15,'north',-31.35,'west',-65.35,'east',-63.70)
   )
 WHERE code='calamuchitar'
   AND JSON_EXTRACT(COALESCE(directory_config,JSON_OBJECT()),'$.geographicBounds') IS NULL;

SHOW TABLES LIKE 'tags_ai_search_locations';
SHOW TABLES LIKE 'tags_ai_search_location_categories';
SHOW TABLES LIKE 'tags_ai_search_location_places';
SHOW TABLES LIKE 'tags_ai_search_items';
SHOW TABLES LIKE 'tags_ai_taxonomy_aliases';
SHOW TABLES LIKE 'tags_ai_tourism_sources';
SHOW TABLES LIKE 'tags_ai_tourism_contents';
SHOW TABLES LIKE 'tags_ai_search_evaluations';
