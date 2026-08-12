-- Tags Directory Network - nucleo multicanal
-- Fecha: 2026-08-06
-- IMPORTANTE: este archivo no modifica tablas historicas ni migra datos.
-- Debe ejecutarse manualmente primero en desarrollo y solo luego de aprobarlo en produccion.

CREATE TABLE IF NOT EXISTS tags_directory_sites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(190) NOT NULL,
  primary_host VARCHAR(255) NOT NULL,
  brand_config JSON NULL,
  seo_config JSON NULL,
  directory_config JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_directory_sites_code (code),
  UNIQUE KEY uq_directory_sites_host (primary_host),
  KEY idx_directory_sites_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_directory_listings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT NULL,
  display_name VARCHAR(190) NOT NULL,
  short_description VARCHAR(500) NULL,
  description MEDIUMTEXT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(80) NULL,
  whatsapp VARCHAR(80) NULL,
  website_url VARCHAR(2000) NULL,
  address VARCHAR(500) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  contact_config JSON NULL,
  social_config JSON NULL,
  opening_hours JSON NULL,
  source_payload JSON NULL,
  status ENUM('draft','published','suspended','archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_directory_listing_business (business_id),
  KEY idx_directory_listing_status_name (status,display_name),
  KEY idx_directory_listing_geo (latitude,longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_directory_site_listings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(190) NOT NULL,
  publication_status ENUM('draft','published','hidden','archived') NOT NULL DEFAULT 'draft',
  is_free TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  seo_title VARCHAR(255) NULL,
  seo_description VARCHAR(500) NULL,
  seo_keywords VARCHAR(1000) NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_directory_site_listing (site_id,listing_id),
  UNIQUE KEY uq_directory_site_slug (site_id,slug),
  KEY idx_directory_site_publication (site_id,publication_status,is_featured,sort_order),
  KEY idx_directory_site_free (site_id,is_free,publication_status),
  CONSTRAINT fk_directory_site_listing_site FOREIGN KEY (site_id) REFERENCES tags_directory_sites(id),
  CONSTRAINT fk_directory_site_listing_listing FOREIGN KEY (listing_id) REFERENCES tags_directory_listings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_directory_taxonomy_nodes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  name VARCHAR(190) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  node_type VARCHAR(60) NOT NULL DEFAULT 'category',
  depth SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  image_url VARCHAR(2000) NULL,
  description VARCHAR(1000) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_directory_taxonomy_sibling_slug (site_id,parent_id,slug),
  KEY idx_directory_taxonomy_tree (site_id,parent_id,is_active,sort_order),
  CONSTRAINT fk_directory_taxonomy_site FOREIGN KEY (site_id) REFERENCES tags_directory_sites(id),
  CONSTRAINT fk_directory_taxonomy_parent FOREIGN KEY (parent_id) REFERENCES tags_directory_taxonomy_nodes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_directory_taxonomy_closure (
  ancestor_id BIGINT UNSIGNED NOT NULL,
  descendant_id BIGINT UNSIGNED NOT NULL,
  depth SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (ancestor_id,descendant_id),
  KEY idx_directory_taxonomy_descendant (descendant_id,depth),
  CONSTRAINT fk_directory_taxonomy_closure_ancestor FOREIGN KEY (ancestor_id) REFERENCES tags_directory_taxonomy_nodes(id) ON DELETE CASCADE,
  CONSTRAINT fk_directory_taxonomy_closure_descendant FOREIGN KEY (descendant_id) REFERENCES tags_directory_taxonomy_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_directory_listing_taxonomy (
  listing_id BIGINT UNSIGNED NOT NULL,
  taxonomy_node_id BIGINT UNSIGNED NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (listing_id,taxonomy_node_id),
  KEY idx_directory_listing_taxonomy_node (taxonomy_node_id,is_primary,sort_order),
  CONSTRAINT fk_directory_listing_taxonomy_listing FOREIGN KEY (listing_id) REFERENCES tags_directory_listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_directory_listing_taxonomy_node FOREIGN KEY (taxonomy_node_id) REFERENCES tags_directory_taxonomy_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_geo_places (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NULL,
  place_type ENUM('country','state','province','department','region','valley','locality','neighborhood','other') NOT NULL,
  name VARCHAR(190) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  country_code CHAR(2) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_geo_place_sibling_slug (parent_id,place_type,slug),
  KEY idx_geo_places_tree (parent_id,place_type,is_active),
  CONSTRAINT fk_geo_places_parent FOREIGN KEY (parent_id) REFERENCES tags_geo_places(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_directory_listing_places (
  listing_id BIGINT UNSIGNED NOT NULL,
  place_id BIGINT UNSIGNED NOT NULL,
  relation_type ENUM('location','service_area') NOT NULL DEFAULT 'location',
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (listing_id,place_id,relation_type),
  KEY idx_directory_listing_places_place (place_id,relation_type,is_primary),
  CONSTRAINT fk_directory_listing_places_listing FOREIGN KEY (listing_id) REFERENCES tags_directory_listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_directory_listing_places_place FOREIGN KEY (place_id) REFERENCES tags_geo_places(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_directory_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id BIGINT UNSIGNED NOT NULL,
  media_type ENUM('logo','cover','gallery','category') NOT NULL DEFAULT 'gallery',
  url VARCHAR(2000) NOT NULL,
  alt_text VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  source_payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_directory_media_listing (listing_id,media_type,is_active,sort_order),
  CONSTRAINT fk_directory_media_listing FOREIGN KEY (listing_id) REFERENCES tags_directory_listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_legacy_routes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NULL,
  source_system VARCHAR(80) NOT NULL,
  legacy_path VARCHAR(500) NOT NULL,
  route_type ENUM('render','redirect','reserved') NOT NULL DEFAULT 'render',
  target_path VARCHAR(500) NULL,
  redirect_status SMALLINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_legacy_route_site_path (site_id,legacy_path),
  KEY idx_legacy_route_listing (listing_id,is_active),
  CONSTRAINT fk_legacy_route_site FOREIGN KEY (site_id) REFERENCES tags_directory_sites(id),
  CONSTRAINT fk_legacy_route_listing FOREIGN KEY (listing_id) REFERENCES tags_directory_listings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_legacy_entity_map (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_system VARCHAR(80) NOT NULL,
  source_table VARCHAR(100) NOT NULL,
  source_id VARCHAR(190) NOT NULL,
  target_table VARCHAR(100) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  source_fingerprint CHAR(64) NULL,
  migrated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_legacy_entity_source_target (source_system,source_table,source_id,target_table),
  KEY idx_legacy_entity_target (target_table,target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tags_directory_sites (code,name,primary_host,brand_config,seo_config,directory_config,is_active)
VALUES (
  'calamuchitar',
  'CalamuchitAr',
  'calamuchita.ar',
  JSON_OBJECT('displayName','CalamuchitAr'),
  JSON_OBJECT('defaultTitle','CalamuchitAr','defaultLocale','es_AR'),
  JSON_OBJECT('mapProvider','google','preserveLegacyRoutes',TRUE),
  1
)
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  updated_at=CURRENT_TIMESTAMP;
