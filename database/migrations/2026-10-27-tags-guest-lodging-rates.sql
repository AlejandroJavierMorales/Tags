-- Tags Alojamiento: tarifas, calendario de venta, restricciones y cotizaciones.
-- PROPUESTA PENDIENTE DE APROBACIÓN. NO EJECUTAR AUTOMÁTICAMENTE.
-- Compatible con MariaDB 10.11. No declara FK contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_guest_rate_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(190) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  pricing_mode VARCHAR(30) NOT NULL DEFAULT 'per_unit',
  base_nightly_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  minimum_nights INT UNSIGNED NOT NULL DEFAULT 1,
  maximum_nights INT UNSIGNED NULL,
  minimum_advance_days INT UNSIGNED NOT NULL DEFAULT 0,
  maximum_advance_days INT UNSIGNED NULL,
  deposit_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_by_id BIGINT UNSIGNED NULL,
  updated_by_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_guest_rate_plans_code (guest_app_id, code),
  KEY idx_tags_guest_rate_plans_active (guest_app_id, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_rate_plan_units (
  guest_app_id BIGINT UNSIGNED NOT NULL,
  rate_plan_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (rate_plan_id, unit_id),
  KEY idx_tags_guest_rate_plan_units_unit (guest_app_id, unit_id, is_active),
  KEY idx_tags_guest_rate_plan_units_plan (guest_app_id, rate_plan_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_rate_occupancy_prices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  rate_plan_id BIGINT UNSIGNED NOT NULL,
  minimum_occupants INT UNSIGNED NOT NULL,
  maximum_occupants INT UNSIGNED NOT NULL,
  nightly_rate DECIMAL(12,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_guest_rate_occupancy_band
    (rate_plan_id, minimum_occupants, maximum_occupants),
  KEY idx_tags_guest_rate_occupancy_lookup
    (guest_app_id, rate_plan_id, is_active, minimum_occupants, maximum_occupants)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_rate_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  rate_plan_id BIGINT UNSIGNED NULL,
  unit_id BIGINT UNSIGNED NULL,
  name VARCHAR(190) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  weekdays_mask CHAR(7) NOT NULL DEFAULT '1111111',
  priority INT NOT NULL DEFAULT 0,
  price_adjustment_type VARCHAR(30) NULL,
  price_adjustment_value DECIMAL(12,2) NULL,
  is_open TINYINT(1) NULL,
  closed_to_arrival TINYINT(1) NULL,
  closed_to_departure TINYINT(1) NULL,
  minimum_nights INT UNSIGNED NULL,
  maximum_nights INT UNSIGNED NULL,
  minimum_advance_days INT UNSIGNED NULL,
  maximum_advance_days INT UNSIGNED NULL,
  gap_policy_mode VARCHAR(40) NULL,
  requires_manual_review TINYINT(1) NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'admin',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by_id BIGINT UNSIGNED NULL,
  updated_by_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tags_guest_rate_rules_lookup
    (guest_app_id, rate_plan_id, status, starts_on, ends_on, priority),
  KEY idx_tags_guest_rate_rules_unit
    (guest_app_id, unit_id, status, starts_on, ends_on),
  KEY idx_tags_guest_rate_rules_updated (guest_app_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_rate_rule_occupancy_prices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  rate_rule_id BIGINT UNSIGNED NOT NULL,
  minimum_occupants INT UNSIGNED NOT NULL,
  maximum_occupants INT UNSIGNED NOT NULL,
  nightly_rate DECIMAL(12,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_guest_rate_rule_occupancy_band
    (rate_rule_id, minimum_occupants, maximum_occupants),
  KEY idx_tags_guest_rate_rule_occupancy_lookup
    (guest_app_id, rate_rule_id, minimum_occupants, maximum_occupants)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_lodging_quotes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  rate_plan_id BIGINT UNSIGNED NOT NULL,
  quote_code VARCHAR(50) NOT NULL,
  access_token_hash CHAR(64) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  availability_decision VARCHAR(40) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  nights INT UNSIGNED NOT NULL,
  adults INT UNSIGNED NOT NULL DEFAULT 1,
  children INT UNSIGNED NOT NULL DEFAULT 0,
  bed_occupants INT UNSIGNED NULL,
  chargeable_occupants INT UNSIGNED NOT NULL DEFAULT 1,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  lodging_subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  extras_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  discounts_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  deposit_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  deposit_required_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  pricing_snapshot_json JSON NOT NULL,
  applied_rules_json JSON NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_guest_lodging_quote_code (guest_app_id, quote_code),
  UNIQUE KEY uq_tags_guest_lodging_quote_token (access_token_hash),
  KEY idx_tags_guest_lodging_quote_inventory
    (guest_app_id, unit_id, starts_on, ends_on, status),
  KEY idx_tags_guest_lodging_quote_expiry (status, expires_at),
  KEY idx_tags_guest_lodging_quote_plan (rate_plan_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tags_guest_booking_requests
  ADD COLUMN quote_id BIGINT UNSIGNED NULL AFTER idempotency_key,
  ADD COLUMN currency VARCHAR(10) NULL AFTER quote_id,
  ADD COLUMN average_nightly_rate DECIMAL(12,2) NULL AFTER currency,
  ADD COLUMN lodging_total DECIMAL(12,2) NULL AFTER average_nightly_rate,
  ADD COLUMN deposit_percentage DECIMAL(5,2) NULL AFTER lodging_total,
  ADD COLUMN deposit_required_amount DECIMAL(12,2) NULL AFTER deposit_percentage,
  ADD COLUMN pricing_snapshot_json JSON NULL AFTER deposit_required_amount,
  ADD KEY idx_tags_guest_booking_request_quote (quote_id);

ALTER TABLE tags_guest_stays
  ADD COLUMN rate_plan_id BIGINT UNSIGNED NULL AFTER unit_id,
  ADD COLUMN lodging_quote_id BIGINT UNSIGNED NULL AFTER rate_plan_id,
  ADD COLUMN pricing_snapshot_json JSON NULL AFTER deposit_required_amount,
  ADD KEY idx_tags_guest_stays_rate_plan (guest_app_id, rate_plan_id),
  ADD KEY idx_tags_guest_stays_quote (lodging_quote_id);
