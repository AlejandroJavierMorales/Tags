-- Tags Guest Experience - economía, accesos reutilizables y comunicaciones
-- Preparada el 2026-08-03. NO EJECUTAR SIN AUTORIZACIÓN EXPLÍCITA.
-- La unidad asignada es interna y nunca debe incluirse en comunicaciones previas al check-in.

ALTER TABLE tags_guest_stays
    ADD COLUMN nightly_rate DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER children,
    ADD COLUMN lodging_total DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER nightly_rate,
    ADD COLUMN deposit_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER lodging_total,
    ADD COLUMN deposit_required_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER deposit_percentage;

ALTER TABLE tags_guest_access_tokens
    ADD COLUMN revoked_at DATETIME NULL AFTER used_at,
    ADD COLUMN last_used_at DATETIME NULL AFTER revoked_at,
    ADD COLUMN use_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER last_used_at,
    ADD KEY idx_tags_guest_access_active (stay_id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS tags_guest_communications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guest_app_id BIGINT UNSIGNED NOT NULL,
    stay_id BIGINT UNSIGNED NOT NULL,
    guest_id BIGINT UNSIGNED NULL,
    access_token_id BIGINT UNSIGNED NULL,
    event_code VARCHAR(80) NOT NULL,
    direction VARCHAR(20) NOT NULL DEFAULT 'outbound',
    channel VARCHAR(30) NOT NULL,
    recipient VARCHAR(190) NULL,
    subject VARCHAR(300) NULL,
    message_text TEXT NULL,
    payload_json JSON NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    scheduled_at DATETIME NULL,
    sent_at DATETIME NULL,
    failed_at DATETIME NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    provider_reference VARCHAR(190) NULL,
    last_error VARCHAR(500) NULL,
    idempotency_key VARCHAR(190) NULL,
    created_by_type VARCHAR(30) NULL,
    created_by_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_guest_communication_idempotency (idempotency_key),
    KEY idx_tags_guest_communication_stay (stay_id, created_at),
    KEY idx_tags_guest_communication_pending (guest_app_id, status, scheduled_at),
    KEY idx_tags_guest_communication_guest (guest_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
