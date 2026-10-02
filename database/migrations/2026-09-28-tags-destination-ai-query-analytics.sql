-- Muchi / Destination AI - consultas y estadisticas anonimas
-- Fecha: 2026-09-28
--
-- Migracion ADITIVA e idempotente.
-- No modifica consumo, conocimiento ni conversaciones existentes.
-- No usa claves foraneas contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_ai_destination_queries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  request_id CHAR(36) NOT NULL,
  conversation_key CHAR(64) NOT NULL,
  source VARCHAR(40) NOT NULL DEFAULT 'public',
  mode ENUM('tourist','resident','unselected') NOT NULL DEFAULT 'unselected',
  question_text TEXT NOT NULL,
  normalized_question VARCHAR(1000) NOT NULL,
  cluster_key CHAR(64) NOT NULL,
  cluster_label VARCHAR(255) NOT NULL,
  intent_type VARCHAR(80) NOT NULL DEFAULT 'other',
  task_types_json JSON NULL,
  taxonomy_ids_json JSON NULL,
  subjects_json JSON NULL,
  locality VARCHAR(190) NULL,
  has_user_location TINYINT(1) NOT NULL DEFAULT 0,
  result_count INT UNSIGNED NOT NULL DEFAULT 0,
  recommended_count INT UNSIGNED NOT NULL DEFAULT 0,
  answer_status ENUM('answered','clarification','no_results','error','blocked') NOT NULL DEFAULT 'answered',
  engine_version VARCHAR(20) NOT NULL DEFAULT 'v1',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_destination_query_request (request_id),
  KEY idx_ai_destination_query_site_date (site_id,created_at),
  KEY idx_ai_destination_query_cluster (site_id,cluster_key,created_at),
  KEY idx_ai_destination_query_status (site_id,answer_status,created_at),
  KEY idx_ai_destination_query_mode (site_id,mode,created_at),
  KEY idx_ai_destination_query_conversation (site_id,conversation_key,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_destination_query_recommendations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  query_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT NULL,
  entity_key VARCHAR(255) NOT NULL,
  entity_type VARCHAR(40) NULL,
  candidate_name VARCHAR(255) NOT NULL,
  locality VARCHAR(190) NULL,
  position INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_destination_query_recommendation (query_id,entity_key),
  KEY idx_ai_destination_recommendation_query (query_id,position),
  KEY idx_ai_destination_recommendation_business (business_id,created_at),
  KEY idx_ai_destination_recommendation_name (candidate_name,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
