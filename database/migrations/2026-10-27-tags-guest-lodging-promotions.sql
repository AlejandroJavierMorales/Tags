-- Tags Alojamiento: promociones aplicadas sobre tarifas ya configuradas.
-- Compatible con MariaDB 10.11. No declara FK contra tablas legacy.
-- Ejecutar una sola vez en desarrollo y producción antes de desplegar el código del módulo.

CREATE TABLE IF NOT EXISTS tags_guest_lodging_promotions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(190) NOT NULL,
  description VARCHAR(1000) NULL,
  coupon_code VARCHAR(80) NULL,
  application_mode VARCHAR(20) NOT NULL DEFAULT 'automatic',
  discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(12,2) NOT NULL,
  booking_starts_at DATETIME NULL,
  booking_ends_at DATETIME NULL,
  stay_starts_on DATE NOT NULL,
  stay_ends_on DATE NOT NULL,
  minimum_nights INT UNSIGNED NULL,
  minimum_advance_days INT UNSIGNED NULL,
  maximum_uses INT UNSIGNED NULL,
  is_combinable TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  created_by_id BIGINT UNSIGNED NULL,
  updated_by_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_guest_lodging_promotions_code (guest_app_id, coupon_code),
  KEY idx_tags_guest_lodging_promotions_stay
    (guest_app_id, status, stay_starts_on, stay_ends_on),
  KEY idx_tags_guest_lodging_promotions_booking
    (guest_app_id, status, booking_starts_at, booking_ends_at),
  KEY idx_tags_guest_lodging_promotions_updated (guest_app_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_lodging_promotion_units (
  promotion_id BIGINT UNSIGNED NOT NULL,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (promotion_id, unit_id),
  KEY idx_tags_guest_lodging_promotion_units_lookup
    (guest_app_id, unit_id, promotion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_lodging_promotion_uses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  promotion_id BIGINT UNSIGNED NOT NULL,
  quote_id BIGINT UNSIGNED NULL,
  booking_request_id BIGINT UNSIGNED NULL,
  stay_id BIGINT UNSIGNED NULL,
  idempotency_key VARCHAR(190) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'reserved',
  currency VARCHAR(10) NOT NULL,
  base_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  promotion_snapshot_json JSON NOT NULL,
  expires_at DATETIME NULL,
  confirmed_at DATETIME NULL,
  released_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_guest_lodging_promotion_use_key
    (guest_app_id, idempotency_key),
  KEY idx_tags_guest_lodging_promotion_use_limit
    (promotion_id, status, expires_at),
  KEY idx_tags_guest_lodging_promotion_use_quote (quote_id),
  KEY idx_tags_guest_lodging_promotion_use_request (booking_request_id),
  KEY idx_tags_guest_lodging_promotion_use_stay (stay_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
