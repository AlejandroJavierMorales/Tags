-- Tags Alojamiento: solicitudes públicas y retenciones temporales de inventario.
-- PROPUESTA PENDIENTE DE APROBACIÓN. NO EJECUTAR AUTOMÁTICAMENTE.
-- Compatible con MariaDB 10.11. No declara FK contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_guest_booking_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  request_code VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'held',
  availability_decision VARCHAR(40) NOT NULL DEFAULT 'available',
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  adults INT UNSIGNED NOT NULL DEFAULT 1,
  children INT UNSIGNED NOT NULL DEFAULT 0,
  bed_occupants INT UNSIGNED NULL,
  customer_name VARCHAR(190) NOT NULL,
  customer_email VARCHAR(190) NULL,
  customer_phone VARCHAR(60) NULL,
  customer_notes VARCHAR(2000) NULL,
  source VARCHAR(40) NOT NULL DEFAULT 'public_web',
  hold_expires_at DATETIME NULL,
  access_token_hash CHAR(64) NOT NULL,
  idempotency_key VARCHAR(190) NOT NULL,
  confirmed_stay_id BIGINT UNSIGNED NULL,
  resolved_at DATETIME NULL,
  resolved_by_id BIGINT UNSIGNED NULL,
  resolution_notes VARCHAR(2000) NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_guest_booking_request_code (guest_app_id, request_code),
  UNIQUE KEY uq_tags_guest_booking_request_token (access_token_hash),
  UNIQUE KEY uq_tags_guest_booking_request_idempotency (guest_app_id, idempotency_key),
  KEY idx_tags_guest_booking_request_inventory (guest_app_id, unit_id, status, starts_on, ends_on),
  KEY idx_tags_guest_booking_request_expiry (status, hold_expires_at),
  KEY idx_tags_guest_booking_request_contact (guest_app_id, customer_email, customer_phone),
  KEY idx_tags_guest_booking_request_stay (confirmed_stay_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_booking_request_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  request_id BIGINT UNSIGNED NOT NULL,
  actor_type VARCHAR(30) NOT NULL,
  actor_id VARCHAR(100) NULL,
  event_type VARCHAR(80) NOT NULL,
  from_status VARCHAR(30) NULL,
  to_status VARCHAR(30) NULL,
  notes VARCHAR(2000) NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tags_guest_booking_request_events_request (request_id, created_at),
  KEY idx_tags_guest_booking_request_events_app (guest_app_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
