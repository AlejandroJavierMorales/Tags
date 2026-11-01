-- Tags Alojamiento: bloqueos operativos de inventario.
-- PROPUESTA PENDIENTE DE APROBACIÓN. No ejecutar junto con el despliegue hasta autorizarla.
-- Compatible con MariaDB 10.11. No declara FK contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_guest_unit_blocks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_app_id BIGINT UNSIGNED NOT NULL,
  scope_type VARCHAR(20) NOT NULL DEFAULT 'unit',
  unit_id BIGINT UNSIGNED NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  block_type VARCHAR(30) NOT NULL DEFAULT 'manual',
  reason VARCHAR(1000) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  idempotency_key VARCHAR(190) NULL,
  created_by_id BIGINT UNSIGNED NULL,
  cancelled_at DATETIME NULL,
  cancelled_by_id BIGINT UNSIGNED NULL,
  cancellation_reason VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_guest_unit_blocks_idempotency (guest_app_id,idempotency_key),
  KEY idx_tags_guest_unit_blocks_range (guest_app_id,status,starts_on,ends_on),
  KEY idx_tags_guest_unit_blocks_unit_range (unit_id,status,starts_on,ends_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
