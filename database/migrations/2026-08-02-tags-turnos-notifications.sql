-- Tags Turnos - entregas, recordatorios y reintentos de notificaciones.
-- Ejecutar manualmente en desarrollo y producción. La aplicación no ejecuta esta migración.

CREATE TABLE IF NOT EXISTS tags_turnos_notification_deliveries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    booking_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,
    event_code VARCHAR(80) NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'email',
    recipient VARCHAR(190) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    payload_json JSON NULL,
    scheduled_at DATETIME NULL,
    sent_at DATETIME NULL,
    failed_at DATETIME NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    provider_reference VARCHAR(190) NULL,
    last_error VARCHAR(500) NULL,
    idempotency_key VARCHAR(190) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_notification_idempotency (idempotency_key),
    KEY idx_tags_turnos_notification_pending (turnos_id, status, scheduled_at),
    KEY idx_tags_turnos_notification_booking (booking_id, created_at),
    KEY idx_tags_turnos_notification_customer (customer_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
