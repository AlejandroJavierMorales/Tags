-- Solicitudes grupales del motor de reservas.
-- Relaciona cada solicitud con todas las unidades cotizadas y con la estadía
-- creada al confirmarse. Sin claves foráneas contra tablas preexistentes.

CREATE TABLE IF NOT EXISTS tags_guest_booking_request_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  request_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  suggested_guests INT UNSIGNED NOT NULL DEFAULT 1,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  pricing_snapshot_json JSON NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'proposed',
  confirmed_stay_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_guest_booking_request_unit (request_id, unit_id),
  KEY idx_tags_guest_booking_request_units_app (guest_app_id, request_id),
  KEY idx_tags_guest_booking_request_units_inventory (guest_app_id, unit_id, status),
  KEY idx_tags_guest_booking_request_units_stay (confirmed_stay_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
