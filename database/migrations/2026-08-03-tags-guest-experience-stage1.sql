-- Tags Guest Experience - Etapa 1
-- Preparada el 2026-08-03. NO ejecutar sin autorización explícita.

INSERT IGNORE INTO tags_addons (
    code, name, description, default_quantity, price, currency,
    is_active, is_public, sort_order, created_at
) VALUES (
    'guest_experience', 'Tags Guest Experience',
    'Experiencia digital de estadía para alojamientos temporarios.',
    1, 0, 'ARS', 1, 1, 50, NOW()
);

CREATE TABLE IF NOT EXISTS tags_guest_apps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NOT NULL,
    page_id BIGINT UNSIGNED NULL,
    slug VARCHAR(190) NOT NULL,
    name VARCHAR(190) NOT NULL,
    logo_url TEXT NULL,
    cover_url TEXT NULL,
    welcome_message VARCHAR(500) NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    settings_json JSON NULL,
    styles_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_guest_apps_business (business_id),
    UNIQUE KEY uq_tags_guest_apps_slug (slug),
    KEY idx_tags_guest_apps_page (page_id),
    KEY idx_tags_guest_apps_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_units (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guest_app_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(80) NULL,
    name VARCHAR(190) NOT NULL,
    description TEXT NULL,
    capacity_adults INT UNSIGNED NOT NULL DEFAULT 1,
    capacity_children INT UNSIGNED NOT NULL DEFAULT 0,
    features_json JSON NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_guest_units_code (guest_app_id, code),
    KEY idx_tags_guest_units_active (guest_app_id, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_people (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    email VARCHAR(190) NULL,
    phone VARCHAR(60) NULL,
    document_type VARCHAR(40) NULL,
    document_number VARCHAR(80) NULL,
    nationality VARCHAR(100) NULL,
    date_of_birth DATE NULL,
    address TEXT NULL,
    notes TEXT NULL,
    privacy_consent_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_guest_people_business_contact (business_id, email, phone),
    KEY idx_tags_guest_people_document (business_id, document_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_stays (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guest_app_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NULL,
    primary_guest_id BIGINT UNSIGNED NOT NULL,
    stay_code VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'upcoming',
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    adults INT UNSIGNED NOT NULL DEFAULT 1,
    children INT UNSIGNED NOT NULL DEFAULT 0,
    source VARCHAR(30) NOT NULL DEFAULT 'manual',
    arrival_notes TEXT NULL,
    internal_notes TEXT NULL,
    checked_in_at DATETIME NULL,
    checked_out_at DATETIME NULL,
    created_by_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_guest_stays_code (guest_app_id, stay_code),
    KEY idx_tags_guest_stays_calendar (guest_app_id, starts_at, ends_at, status),
    KEY idx_tags_guest_stays_guest (primary_guest_id, created_at),
    KEY idx_tags_guest_stays_unit (unit_id, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_stay_people (
    stay_id BIGINT UNSIGNED NOT NULL,
    guest_id BIGINT UNSIGNED NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'companion',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (stay_id, guest_id),
    KEY idx_tags_guest_stay_people_guest (guest_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_access_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guest_app_id BIGINT UNSIGNED NOT NULL,
    stay_id BIGINT UNSIGNED NOT NULL,
    guest_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'manual',
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_guest_access_token_hash (token_hash),
    KEY idx_tags_guest_access_stay (stay_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guest_app_id BIGINT UNSIGNED NOT NULL,
    stay_id BIGINT UNSIGNED NOT NULL,
    guest_id BIGINT UNSIGNED NOT NULL,
    session_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    last_seen_at DATETIME NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_guest_sessions_hash (session_hash),
    KEY idx_tags_guest_sessions_stay (stay_id, expires_at, revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_accounts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guest_app_id BIGINT UNSIGNED NOT NULL,
    stay_id BIGINT UNSIGNED NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_guest_accounts_stay (stay_id),
    KEY idx_tags_guest_accounts_status (guest_app_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_account_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    account_id BIGINT UNSIGNED NOT NULL,
    entry_type VARCHAR(30) NOT NULL,
    source_type VARCHAR(40) NOT NULL DEFAULT 'manual',
    source_id VARCHAR(100) NULL,
    idempotency_key VARCHAR(190) NULL,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
    unit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
    reverses_entry_id BIGINT UNSIGNED NULL,
    metadata_json JSON NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_type VARCHAR(30) NULL,
    created_by_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_guest_account_entry_idempotency (account_id, idempotency_key),
    KEY idx_tags_guest_account_entries_account (account_id, occurred_at),
    KEY idx_tags_guest_account_entries_source (source_type, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    account_id BIGINT UNSIGNED NOT NULL,
    account_entry_id BIGINT UNSIGNED NOT NULL,
    payment_method VARCHAR(40) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    reference VARCHAR(190) NULL,
    notes TEXT NULL,
    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_by_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_guest_payments_account (account_id, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guest_app_id BIGINT UNSIGNED NOT NULL,
    stay_id BIGINT UNSIGNED NULL,
    actor_type VARCHAR(30) NOT NULL,
    actor_id VARCHAR(100) NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NULL,
    entity_id VARCHAR(100) NULL,
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_guest_audit_app (guest_app_id, created_at),
    KEY idx_tags_guest_audit_stay (stay_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
