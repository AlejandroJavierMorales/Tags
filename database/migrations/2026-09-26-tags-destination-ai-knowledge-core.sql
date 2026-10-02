-- Muchi / Tags Destination AI - índice de conocimiento público, fase 1.
-- NO ejecutado automáticamente. Aplicar primero en desarrollo.
-- No declara FKs contra tablas legacy: sus PK difieren entre instalaciones.
-- MySQL verificado en desarrollo al diseñar: 8.0.37.

CREATE TABLE IF NOT EXISTS tags_ai_knowledge_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT NULL,
  listing_id BIGINT UNSIGNED NULL,
  entity_type VARCHAR(40) NOT NULL,
  source_type VARCHAR(80) NOT NULL,
  source_id VARCHAR(190) NOT NULL,
  canonical_key VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  searchable_text MEDIUMTEXT NOT NULL,
  attributes_json JSON NULL,
  commercial_json JSON NULL,
  location_json JSON NULL,
  availability_json JSON NULL,
  actions_json JSON NULL,
  primary_image_url VARCHAR(2000) NULL,
  images_json JSON NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  visibility ENUM('public','hidden','stale','rejected') NOT NULL DEFAULT 'public',
  verification_status ENUM('automatic','business_confirmed','editor_confirmed','rejected','stale') NOT NULL DEFAULT 'automatic',
  quality_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  source_updated_at DATETIME NULL,
  indexed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_knowledge_site_canonical (site_id,canonical_key),
  KEY idx_ai_knowledge_site_type_visible (site_id,entity_type,visibility),
  KEY idx_ai_knowledge_business (business_id,visibility),
  KEY idx_ai_knowledge_listing (listing_id,visibility),
  KEY idx_ai_knowledge_source (source_type,source_id),
  KEY idx_ai_knowledge_geo (latitude,longitude),
  KEY idx_ai_knowledge_sync (site_id,source_updated_at,indexed_at),
  FULLTEXT KEY ftx_ai_knowledge_text (title,summary,searchable_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_knowledge_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id BIGINT UNSIGNED NOT NULL,
  claim_type VARCHAR(40) NOT NULL,
  canonical_value VARCHAR(255) NOT NULL,
  display_value VARCHAR(255) NOT NULL,
  qualifiers_json JSON NULL,
  evidence_kind ENUM('structured','explicit_text','business_editorial','directory_editorial','category_inference') NOT NULL,
  evidence_excerpt VARCHAR(1000) NULL,
  source_field VARCHAR(190) NULL,
  confidence DECIMAL(5,4) NOT NULL DEFAULT 1,
  status ENUM('detected','confirmed','rejected','expired') NOT NULL DEFAULT 'detected',
  confirmed_by_type VARCHAR(30) NULL,
  confirmed_by_id BIGINT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_claim_document_value (document_id,claim_type,canonical_value),
  KEY idx_ai_claim_lookup (claim_type,canonical_value,status,evidence_kind),
  KEY idx_ai_claim_review (status,evidence_kind,created_at),
  CONSTRAINT fk_ai_claim_document FOREIGN KEY (document_id)
    REFERENCES tags_ai_knowledge_documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_business_profile_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT NOT NULL,
  entry_type VARCHAR(40) NOT NULL,
  canonical_value VARCHAR(255) NOT NULL,
  display_value VARCHAR(255) NOT NULL,
  description TEXT NULL,
  attributes_json JSON NULL,
  status ENUM('active','inactive','rejected') NOT NULL DEFAULT 'active',
  verification_status ENUM('business_confirmed','editor_confirmed') NOT NULL DEFAULT 'business_confirmed',
  created_by_type VARCHAR(30) NULL,
  created_by_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_business_entry (site_id,business_id,entry_type,canonical_value),
  KEY idx_ai_business_entry_active (site_id,business_id,status,entry_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_concept_aliases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NULL,
  concept_type VARCHAR(40) NOT NULL,
  canonical_value VARCHAR(255) NOT NULL,
  alias_value VARCHAR(255) NOT NULL,
  locale VARCHAR(20) NOT NULL DEFAULT 'es-AR',
  source_type VARCHAR(30) NOT NULL DEFAULT 'editorial',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_alias_scope (site_id,concept_type,alias_value),
  KEY idx_ai_alias_canonical (site_id,concept_type,canonical_value,is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_index_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT NULL,
  source_type VARCHAR(80) NULL,
  source_id VARCHAR(190) NULL,
  operation ENUM('upsert','hide','rebuild_business','rebuild_site') NOT NULL,
  status ENUM('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  last_error VARCHAR(2000) NULL,
  payload_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_index_jobs_queue (status,available_at,id),
  KEY idx_ai_index_jobs_business (site_id,business_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_knowledge_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT NULL,
  actor_type VARCHAR(30) NOT NULL,
  actor_id BIGINT NULL,
  action_code VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id BIGINT UNSIGNED NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_knowledge_audit_site (site_id,created_at),
  KEY idx_ai_knowledge_audit_business (business_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vocabulario inicial global. Es idempotente aun cuando site_id sea NULL.
INSERT INTO tags_ai_concept_aliases
  (site_id,concept_type,canonical_value,alias_value,locale,source_type,is_active)
SELECT NULL,'product','control remoto','mando a distancia','es-AR','platform',1
WHERE NOT EXISTS (
  SELECT 1 FROM tags_ai_concept_aliases
   WHERE site_id IS NULL AND concept_type='product' AND alias_value='mando a distancia'
);

INSERT INTO tags_ai_concept_aliases
  (site_id,concept_type,canonical_value,alias_value,locale,source_type,is_active)
SELECT NULL,'product','televisor','tv','es-AR','platform',1
WHERE NOT EXISTS (
  SELECT 1 FROM tags_ai_concept_aliases
   WHERE site_id IS NULL AND concept_type='product' AND alias_value='tv'
);

-- Verificación compatible con usuarios cPanel sin acceso a information_schema.
SHOW TABLES LIKE 'tags_ai_knowledge_documents';
SHOW TABLES LIKE 'tags_ai_knowledge_claims';
SHOW TABLES LIKE 'tags_ai_business_profile_entries';
SHOW TABLES LIKE 'tags_ai_concept_aliases';
SHOW TABLES LIKE 'tags_ai_index_jobs';
SHOW TABLES LIKE 'tags_ai_knowledge_audit_log';
