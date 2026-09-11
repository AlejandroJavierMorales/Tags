-- Segunda etapa de Tags Fidelización:
-- identificación temporal del comercio y solicitudes iniciadas por usuarios.
-- Sin claves foráneas para conservar compatibilidad con los tipos de IDs existentes.

CREATE TABLE IF NOT EXISTS tags_loyalty_merchant_codes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NOT NULL,
    program_id BIGINT UNSIGNED NOT NULL,
    access_code VARCHAR(12) NOT NULL,
    qr_token VARCHAR(96) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    expires_at DATETIME NOT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_loyalty_merchant_business (business_id),
    UNIQUE KEY uq_tags_loyalty_merchant_access_code (access_code),
    UNIQUE KEY uq_tags_loyalty_merchant_qr_token (qr_token),
    KEY idx_tags_loyalty_merchant_expiry (status,expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_loyalty_claims (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NOT NULL,
    program_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    claim_type VARCHAR(30) NOT NULL DEFAULT 'accrual',
    reward_id BIGINT UNSIGNED NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    requested_amount DECIMAL(12,2) NULL,
    requested_notes VARCHAR(500) NULL,
    approved_points BIGINT NOT NULL DEFAULT 0,
    approved_stamps INT NOT NULL DEFAULT 0,
    approved_visits INT NOT NULL DEFAULT 0,
    transaction_id BIGINT UNSIGNED NULL,
    redemption_id BIGINT UNSIGNED NULL,
    reviewed_by_user_id BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    rejection_reason VARCHAR(500) NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_loyalty_claim_business (business_id,status,created_at),
    KEY idx_tags_loyalty_claim_member (member_id,status,created_at),
    KEY idx_tags_loyalty_claim_expiry (status,expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
