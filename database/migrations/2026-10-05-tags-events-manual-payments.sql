-- Tags Events - Etapa 4: pago manual y comprobantes.
-- Ejecutar después de 2026-10-05-tags-events-public-registration.sql.
-- No declara FK contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_event_payment_settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id INT NOT NULL,
    payment_mode ENUM('free','manual','mercadopago') NOT NULL DEFAULT 'free',
    ticket_price DECIMAL(12,2) NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    manual_payment_title VARCHAR(190) NULL,
    manual_payment_instructions TEXT NULL,
    manual_payment_holder VARCHAR(190) NULL,
    manual_payment_alias VARCHAR(190) NULL,
    manual_payment_cbu VARCHAR(80) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_payment_settings_event (event_id),
    KEY idx_event_payment_settings_mode (payment_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_event_registration_payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    registration_id BIGINT UNSIGNED NOT NULL,
    event_id INT NOT NULL,
    attendee_id INT NOT NULL,
    provider ENUM('manual','mercadopago') NOT NULL DEFAULT 'manual',
    status ENUM('pending','submitted','approved','rejected','cancelled','refunded') NOT NULL DEFAULT 'pending',
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    proof_url VARCHAR(2000) NULL,
    proof_storage_path VARCHAR(1000) NULL,
    proof_mime_type VARCHAR(100) NULL,
    proof_size_bytes INT UNSIGNED NULL,
    payer_reference VARCHAR(255) NULL,
    attendee_notes TEXT NULL,
    review_notes TEXT NULL,
    submitted_at DATETIME NULL,
    reviewed_at DATETIME NULL,
    reviewed_by_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_registration_payment_registration (registration_id),
    KEY idx_event_registration_payments_event_status (event_id,status),
    KEY idx_event_registration_payments_attendee (attendee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
