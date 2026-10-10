-- Muchi / Destination AI - Importacion turistica v3
-- Ejecutar una sola vez en desarrollo y luego en produccion.
-- No usa claves foraneas contra tablas legacy.

ALTER TABLE tags_ai_tourism_contents
  ADD COLUMN external_key VARCHAR(190) NULL AFTER source_id,
  ADD COLUMN contact_json JSON NULL AFTER availability_json,
  ADD COLUMN practical_json JSON NULL AFTER contact_json,
  ADD COLUMN event_json JSON NULL AFTER practical_json,
  ADD COLUMN source_url VARCHAR(2000) NULL AFTER public_url,
  ADD COLUMN source_checked_at DATE NULL AFTER source_url,
  ADD COLUMN loaded_by_name VARCHAR(190) NULL AFTER source_checked_at,
  ADD COLUMN loaded_by_kind VARCHAR(40) NULL AFTER loaded_by_name,
  ADD COLUMN pending_confirmation_text TEXT NULL AFTER loaded_by_kind,
  ADD COLUMN show_in_muchi TINYINT(1) NOT NULL DEFAULT 1 AFTER pending_confirmation_text,
  ADD COLUMN show_on_map TINYINT(1) NOT NULL DEFAULT 1 AFTER show_in_muchi,
  ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER show_on_map,
  ADD UNIQUE KEY uq_ai_tourism_content_external (site_id,external_key),
  ADD KEY idx_ai_tourism_content_verification (site_id,verification_status,source_checked_at);
