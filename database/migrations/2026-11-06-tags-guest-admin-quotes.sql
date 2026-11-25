-- Mi Estadía: presupuestos administrativos persistentes.
-- Compatible con MariaDB 10.11.
-- No declara claves foráneas contra tablas preexistentes.

ALTER TABLE tags_guest_lodging_quotes
  MODIFY COLUMN rate_plan_id BIGINT UNSIGNED NULL,
  ADD COLUMN customer_name VARCHAR(190) NULL AFTER chargeable_occupants,
  ADD COLUMN customer_email VARCHAR(190) NULL AFTER customer_name,
  ADD COLUMN customer_phone VARCHAR(60) NULL AFTER customer_email,
  ADD COLUMN customer_notes TEXT NULL AFTER customer_phone,
  ADD COLUMN public_unit_label VARCHAR(190) NULL AFTER customer_notes,
  ADD COLUMN source VARCHAR(40) NOT NULL DEFAULT 'public_web' AFTER applied_rules_json,
  ADD COLUMN content_snapshot_json JSON NULL AFTER source,
  ADD COLUMN created_by_id BIGINT UNSIGNED NULL AFTER content_snapshot_json,
  ADD COLUMN cancelled_at DATETIME NULL AFTER consumed_at,
  ADD COLUMN last_sent_at DATETIME NULL AFTER cancelled_at,
  ADD KEY idx_tags_guest_quote_customer_name (guest_app_id, customer_name),
  ADD KEY idx_tags_guest_quote_customer_email (guest_app_id, customer_email),
  ADD KEY idx_tags_guest_quote_customer_phone (guest_app_id, customer_phone),
  ADD KEY idx_tags_guest_quote_created (guest_app_id, created_at),
  ADD KEY idx_tags_guest_quote_status_expiry (guest_app_id, status, expires_at);

CREATE TABLE IF NOT EXISTS tags_guest_lodging_quote_sequences (
  guest_app_id BIGINT UNSIGNED NOT NULL,
  sequence_year SMALLINT UNSIGNED NOT NULL,
  last_number SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (guest_app_id, sequence_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_lodging_quote_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  quote_id BIGINT UNSIGNED NOT NULL,
  actor_type VARCHAR(30) NOT NULL DEFAULT 'owner',
  actor_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(60) NOT NULL,
  channel VARCHAR(30) NULL,
  recipient VARCHAR(190) NULL,
  delivery_status VARCHAR(30) NULL,
  notes TEXT NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tags_guest_quote_events_quote (guest_app_id, quote_id, created_at),
  KEY idx_tags_guest_quote_events_type (guest_app_id, event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

