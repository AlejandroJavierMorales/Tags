-- Tags Fidelizacion / Loyalty - nucleo inicial
-- Ejecutar primero en desarrollo y verificar la estructura real antes de produccion.
-- No modifica tablas existentes ni crea una identidad por negocio.

INSERT INTO tags_addons (
    code, name, description, addon_type, page_type, default_quantity,
    price, currency, is_active, is_public, sort_order, created_at
) VALUES (
    'loyalty',
    'Tags Fidelizacion',
    'Programas de puntos, sellos, visitas, recompensas y beneficios para clientes.',
    'service',
    NULL,
    1,
    0,
    'ARS',
    1,
    1,
    85,
    NOW()
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    addon_type = VALUES(addon_type),
    page_type = VALUES(page_type),
    is_active = 1,
    is_public = 1,
    sort_order = VALUES(sort_order);

-- Identidad global de personas. El registro inicial puede ser minimo;
-- los demas campos quedan disponibles para completar posteriormente.
CREATE TABLE IF NOT EXISTS tags_users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(190) NOT NULL,
    email_normalized VARCHAR(190) NOT NULL,
    email_verified_at DATETIME NULL,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    display_name VARCHAR(240) NULL,
    phone VARCHAR(60) NULL,
    whatsapp VARCHAR(60) NULL,
    document_type VARCHAR(40) NULL,
    document_number VARCHAR(80) NULL,
    birth_date DATE NULL,
    gender VARCHAR(40) NULL,
    nationality VARCHAR(100) NULL,
    address VARCHAR(500) NULL,
    locality VARCHAR(120) NULL,
    province VARCHAR(120) NULL,
    country VARCHAR(120) NULL,
    profile_image_url VARCHAR(2000) NULL,
    profile_image_storage_path VARCHAR(1000) NULL,
    profile_image_width SMALLINT UNSIGNED NULL,
    profile_image_height SMALLINT UNSIGNED NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    source VARCHAR(80) NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_users_email_normalized (email_normalized),
    KEY idx_tags_users_status (status),
    KEY idx_tags_users_document (document_type, document_number),
    KEY idx_tags_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_user_auth_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(190) NOT NULL,
    token VARCHAR(128) NOT NULL,
    context_code VARCHAR(120) NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    requested_ip VARCHAR(64) NULL,
    user_agent VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_user_auth_token (token),
    KEY idx_tags_user_auth_user (user_id, expires_at),
    KEY idx_tags_user_auth_email (email, expires_at),
    KEY idx_tags_user_auth_context (context_code, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_user_consents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    consent_version VARCHAR(40) NOT NULL,
    context_code VARCHAR(120) NULL,
    granted TINYINT(1) NOT NULL DEFAULT 0,
    granted_at DATETIME NULL,
    revoked_at DATETIME NULL,
    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_user_consents_user (user_id, consent_type, created_at),
    KEY idx_tags_user_consents_context (context_code, consent_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_user_directory_memberships (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    directory_site_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    source VARCHAR(80) NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_user_directory_membership (user_id, directory_site_id),
    KEY idx_tags_user_directory_status (directory_site_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_user_business_roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    business_id BIGINT UNSIGNED NOT NULL,
    role_code VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_user_business_role (user_id, business_id, role_code),
    KEY idx_tags_user_business_status (business_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_loyalty_members (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    member_code VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    qr_token_hash CHAR(64) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_loyalty_member_user (user_id),
    UNIQUE KEY uq_tags_loyalty_member_code (member_code),
    UNIQUE KEY uq_tags_loyalty_member_qr_token (qr_token_hash),
    KEY idx_tags_loyalty_member_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_loyalty_programs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NOT NULL,
    directory_site_id BIGINT UNSIGNED NULL,
    name VARCHAR(190) NOT NULL,
    description TEXT NULL,
    mechanic VARCHAR(20) NOT NULL DEFAULT 'points',
    points_currency DECIMAL(12,2) NULL,
    points_per_currency DECIMAL(12,4) NULL,
    stamp_target INT UNSIGNED NULL,
    visit_target INT UNSIGNED NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    settings_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_loyalty_program_business (business_id),
    KEY idx_tags_loyalty_program_directory (directory_site_id, status),
    KEY idx_tags_loyalty_program_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_loyalty_accounts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    program_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    points_balance BIGINT NOT NULL DEFAULT 0,
    stamps_balance INT NOT NULL DEFAULT 0,
    visits_balance INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_loyalty_account_program_member (program_id, member_id),
    KEY idx_tags_loyalty_account_member (member_id, status),
    KEY idx_tags_loyalty_account_program (program_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_loyalty_transactions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    account_id BIGINT UNSIGNED NOT NULL,
    program_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    transaction_type VARCHAR(40) NOT NULL,
    points_delta BIGINT NOT NULL DEFAULT 0,
    stamps_delta INT NOT NULL DEFAULT 0,
    visits_delta INT NOT NULL DEFAULT 0,
    points_balance_after BIGINT NOT NULL DEFAULT 0,
    stamps_balance_after INT NOT NULL DEFAULT 0,
    visits_balance_after INT NOT NULL DEFAULT 0,
    amount DECIMAL(12,2) NULL,
    source VARCHAR(40) NOT NULL DEFAULT 'manual',
    reference_type VARCHAR(80) NULL,
    reference_id VARCHAR(120) NULL,
    description VARCHAR(500) NULL,
    performed_by_user_id BIGINT UNSIGNED NULL,
    idempotency_key VARCHAR(190) NULL,
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_loyalty_transaction_idempotency (idempotency_key),
    KEY idx_tags_loyalty_transactions_account (account_id, created_at),
    KEY idx_tags_loyalty_transactions_program (program_id, created_at),
    KEY idx_tags_loyalty_transactions_member (member_id, created_at),
    KEY idx_tags_loyalty_transactions_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_loyalty_rewards (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    program_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    description TEXT NULL,
    reward_type VARCHAR(40) NOT NULL,
    reward_value DECIMAL(12,2) NULL,
    required_points INT UNSIGNED NULL,
    required_stamps INT UNSIGNED NULL,
    required_visits INT UNSIGNED NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    valid_from DATETIME NULL,
    valid_until DATETIME NULL,
    settings_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_loyalty_rewards_program (program_id, status),
    KEY idx_tags_loyalty_rewards_validity (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_loyalty_redemptions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reward_id BIGINT UNSIGNED NOT NULL,
    program_id BIGINT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
    redeemed_by_user_id BIGINT UNSIGNED NULL,
    transaction_id BIGINT UNSIGNED NULL,
    notes VARCHAR(500) NULL,
    redeemed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reversed_at DATETIME NULL,
    reversal_reason VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_loyalty_redemptions_program (program_id, redeemed_at),
    KEY idx_tags_loyalty_redemptions_member (member_id, redeemed_at),
    KEY idx_tags_loyalty_redemptions_reward (reward_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_loyalty_network_memberships (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    directory_site_id BIGINT UNSIGNED NOT NULL,
    business_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    settings_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_loyalty_network_business (directory_site_id, business_id),
    KEY idx_tags_loyalty_network_status (directory_site_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
