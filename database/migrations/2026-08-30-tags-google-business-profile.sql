-- Tags Google Maps Profile - addon y datos especificos de Google Business Profile.
-- NO ejecutar automaticamente. Probar primero en desarrollo.
-- Los datos comunes del negocio permanecen en tags_businesses y tags_business_places.
-- Se omiten FOREIGN KEY para evitar incompatibilidades entre instalaciones historicas.

INSERT INTO tags_addons (
    code, name, description, addon_type, page_type, default_quantity,
    price, currency, is_active, is_public, sort_order, created_at
) VALUES (
    'google_business_profile',
    'Tags Google Maps Profile',
    'Centro de presencia digital, optimizacion y administracion de Google Business Profile.',
    'service', NULL, 1, 0, 'ARS', 1, 1, 90, NOW()
)
ON DUPLICATE KEY UPDATE
    name=VALUES(name), description=VALUES(description), addon_type=VALUES(addon_type),
    page_type=VALUES(page_type), is_active=1, is_public=1, sort_order=VALUES(sort_order);

CREATE TABLE IF NOT EXISTS tags_google_business_profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id INT NOT NULL,
    business_type VARCHAR(60) NULL,
    business_subtype VARCHAR(120) NULL,
    primary_category_id VARCHAR(190) NULL,
    primary_category_name VARCHAR(190) NULL,
    secondary_categories_json JSON NULL,
    has_physical_location TINYINT(1) NOT NULL DEFAULT 1,
    is_service_area_business TINYINT(1) NOT NULL DEFAULT 0,
    service_areas_json JSON NULL,
    regular_hours_json JSON NULL,
    special_hours_json JSON NULL,
    services_json JSON NULL,
    attributes_json JSON NULL,
    profile_status VARCHAR(40) NOT NULL DEFAULT 'not_started',
    completion_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_google_business_profile_business (business_id),
    KEY idx_tags_google_business_profile_status (profile_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_google_business_profile_answers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id INT NOT NULL,
    question_code VARCHAR(100) NOT NULL,
    value_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_google_profile_answer (business_id, question_code),
    KEY idx_tags_google_profile_answers_business (business_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_google_business_connections (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id INT NOT NULL,
    google_user_email VARCHAR(190) NULL,
    google_account_name VARCHAR(190) NULL,
    google_account_label VARCHAR(255) NULL,
    google_location_name VARCHAR(255) NULL,
    google_location_label VARCHAR(255) NULL,
    google_place_id VARCHAR(255) NULL,
    google_maps_url VARCHAR(2000) NULL,
    connection_status VARCHAR(40) NOT NULL DEFAULT 'not_connected',
    ownership_status VARCHAR(40) NOT NULL DEFAULT 'not_requested',
    verification_status VARCHAR(40) NOT NULL DEFAULT 'not_started',
    encrypted_access_token MEDIUMTEXT NULL,
    encrypted_refresh_token MEDIUMTEXT NULL,
    token_expires_at DATETIME NULL,
    granted_scope TEXT NULL,
    accounts_json JSON NULL,
    locations_json JSON NULL,
    last_sync_at DATETIME NULL,
    last_error VARCHAR(1000) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_google_connection_business (business_id),
    KEY idx_tags_google_connection_status (connection_status),
    KEY idx_tags_google_location_name (google_location_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_google_business_sync_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id INT NOT NULL,
    action VARCHAR(80) NOT NULL,
    direction VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    request_data_json JSON NULL,
    response_data_json JSON NULL,
    error_message VARCHAR(1500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_google_sync_business_date (business_id, created_at),
    KEY idx_tags_google_sync_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_google_business_verifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id INT NOT NULL,
    google_location_name VARCHAR(255) NOT NULL,
    verification_name VARCHAR(255) NULL,
    method VARCHAR(60) NULL,
    status VARCHAR(60) NOT NULL DEFAULT 'not_started',
    external_action_required TINYINT(1) NOT NULL DEFAULT 0,
    options_json JSON NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_google_verification_business (business_id, created_at),
    KEY idx_tags_google_verification_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
