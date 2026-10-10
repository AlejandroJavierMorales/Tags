-- Tags Events - Etapa 5: Mercado Pago Checkout Pro y conciliacion automatica.
-- Ejecutar despues de 2026-10-05-tags-events-manual-payments.sql.
-- No declara FK contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_event_payment_accounts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT NOT NULL,
    provider ENUM('mercadopago') NOT NULL DEFAULT 'mercadopago',
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    account_name VARCHAR(190) NULL,
    account_email VARCHAR(255) NULL,
    encrypted_access_token MEDIUMTEXT NULL,
    encrypted_webhook_secret MEDIUMTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_payment_account_business_provider (business_id,provider),
    KEY idx_event_payment_account_active (provider,is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tags_event_registration_payments
    ADD COLUMN provider_preference_id VARCHAR(255) NULL AFTER provider,
    ADD COLUMN provider_payment_id VARCHAR(255) NULL AFTER provider_preference_id,
    ADD COLUMN provider_status VARCHAR(80) NULL AFTER provider_payment_id,
    ADD COLUMN payment_url VARCHAR(2000) NULL AFTER provider_status,
    ADD COLUMN raw_response_json LONGTEXT NULL AFTER payment_url,
    ADD COLUMN paid_at DATETIME NULL AFTER reviewed_by_id,
    ADD UNIQUE KEY uq_event_payment_provider_payment (provider,provider_payment_id),
    ADD UNIQUE KEY uq_event_payment_provider_preference (provider,provider_preference_id);

CREATE TABLE IF NOT EXISTS tags_event_payment_provider_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    provider ENUM('mercadopago') NOT NULL DEFAULT 'mercadopago',
    event_key VARCHAR(255) NOT NULL,
    account_id BIGINT UNSIGNED NULL,
    registration_payment_id BIGINT UNSIGNED NULL,
    event_type VARCHAR(120) NULL,
    resource_id VARCHAR(255) NULL,
    request_id VARCHAR(255) NULL,
    processing_status ENUM('received','processed','ignored','failed') NOT NULL DEFAULT 'received',
    payload_json LONGTEXT NULL,
    error_message TEXT NULL,
    processed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_payment_provider_event (provider,event_key),
    KEY idx_event_payment_provider_resource (provider,resource_id),
    KEY idx_event_payment_provider_registration (registration_payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
