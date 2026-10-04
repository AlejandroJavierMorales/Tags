-- Tags Turnos - respuestas operativas configurables por reserva.
-- Ejecutar manualmente primero en desarrollo y luego en producción.
-- No modifica tablas existentes y no declara claves foráneas contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_turnos_booking_answers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id BIGINT UNSIGNED NOT NULL,
    field_key VARCHAR(80) NOT NULL,
    field_label VARCHAR(190) NOT NULL,
    field_type VARCHAR(30) NOT NULL DEFAULT 'text',
    answer_text TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_booking_answers_field (booking_id, field_key),
    KEY idx_tags_turnos_booking_answers_booking (booking_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
