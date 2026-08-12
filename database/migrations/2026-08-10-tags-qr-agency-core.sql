-- Tags QR Agency - estructura inicial, addon y planes
-- Fecha: 2026-08-10
-- NO ejecutar sin revisión y autorización explícita.
-- No modifica ni elimina registros QR existentes.

INSERT INTO tags_addons (
    code, name, description, addon_type, page_type,
    default_quantity, price, currency, is_active, is_public, sort_order, created_at
) VALUES (
    'qr_agency',
    'Tags QR Agency',
    'Administración de clientes y códigos QR dinámicos para agencias y revendedores.',
    'service',
    NULL,
    1,
    0,
    'ARS',
    1,
    1,
    65,
    NOW()
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    addon_type = VALUES(addon_type),
    page_type = VALUES(page_type),
    is_active = VALUES(is_active),
    is_public = VALUES(is_public),
    sort_order = VALUES(sort_order);

-- Producto técnico requerido por el contrato actual de tags_qr_codes.product_id.
-- El producto digital ya existe en Tags. La activación lo localiza por soporte y tipo QR digital.
DELETE FROM tags_products
WHERE name='QR Digital Agencia' AND support_id IS NULL AND qr_type_id IS NULL
AND NOT EXISTS (SELECT 1 FROM tags_qr_codes q WHERE q.product_id=tags_products.id);

-- Los precios son valores iniciales revisables desde el CRUD de planes.
/* Los planes Agency creados por una versión anterior no deben reemplazar el plan principal. */
INSERT INTO tags_plans (
    code, name, description, price, currency, max_qr_codes,
    dashboard_enabled, reports_enabled, reports_email_enabled,
    reports_whatsapp_enabled, analytics_enabled, analytics_plus_enabled,
    allow_pause_qr, allow_edit_qr, priority_support,
    created_at, is_active, is_public, sort_order, is_free
) VALUES
('agency25', 'Agencia25', 'Plan para agencias con hasta 25 códigos QR dinámicos.', 25000, 'ARS', 25, 1, 1, 0, 0, 1, 0, 1, 1, 0, NOW(), 1, 0, 70, 0),
('agency50', 'Agencia50', 'Plan para agencias con hasta 50 códigos QR dinámicos.', 25000, 'ARS', 50, 1, 1, 0, 0, 1, 0, 1, 1, 0, NOW(), 1, 0, 71, 0),
('agency100', 'Agencia100', 'Hasta 50 QR incluidos y ARS 500 por cada QR activo adicional, con máximo de 100.', 25000, 'ARS', 100, 1, 1, 0, 0, 1, 1, 1, 1, 0, NOW(), 1, 0, 72, 0),
('agency_pro', 'AgenciaPro', 'Plan comercialmente ilimitado con límite técnico inicial de 1000 códigos QR.', 50000, 'ARS', 1000, 1, 1, 1, 1, 1, 1, 1, 1, 1, NOW(), 1, 0, 73, 0)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    price = VALUES(price),
    currency = VALUES(currency),
    max_qr_codes = VALUES(max_qr_codes),
    dashboard_enabled = VALUES(dashboard_enabled),
    reports_enabled = VALUES(reports_enabled),
    analytics_enabled = VALUES(analytics_enabled),
    analytics_plus_enabled = VALUES(analytics_plus_enabled),
    allow_pause_qr = VALUES(allow_pause_qr),
    allow_edit_qr = VALUES(allow_edit_qr),
    priority_support = VALUES(priority_support),
    is_active = 0,
    sort_order = VALUES(sort_order);

UPDATE tags_plans SET is_active=0,is_public=0
WHERE code IN ('agency25','agency50','agency100','agency_pro');

CREATE TABLE IF NOT EXISTS tags_qr_agency_tiers (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(100) NOT NULL,
    included_qrs INT UNSIGNED NOT NULL,
    hard_limit_qrs INT UNSIGNED NOT NULL,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    additional_unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    billing_mode ENUM('fixed','fixed_plus_usage') NOT NULL DEFAULT 'fixed',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_qr_agency_tier_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tags_qr_agency_tiers
    (code,name,included_qrs,hard_limit_qrs,base_price,additional_unit_price,currency,billing_mode,is_active,sort_order)
VALUES
    ('agency25','Agencia25',25,25,25000,0,'ARS','fixed',1,10),
    ('agency50','Agencia50',50,50,25000,0,'ARS','fixed',1,20),
    ('agency100','Agencia100',50,100,25000,500,'ARS','fixed_plus_usage',1,30),
    ('agency_pro','AgenciaPro',1000,1000,50000,0,'ARS','fixed',1,40)
ON DUPLICATE KEY UPDATE
    name=VALUES(name),included_qrs=VALUES(included_qrs),hard_limit_qrs=VALUES(hard_limit_qrs),
    base_price=VALUES(base_price),additional_unit_price=VALUES(additional_unit_price),currency=VALUES(currency),
    billing_mode=VALUES(billing_mode),is_active=VALUES(is_active),sort_order=VALUES(sort_order);

-- Las modalidades dependen del addon y se resuelven exclusivamente con tags_qr_agency_tiers.
DROP TABLE IF EXISTS tags_qr_agency_plan_rules;

CREATE TABLE IF NOT EXISTS tags_qr_agencies (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NOT NULL,
    digital_product_id BIGINT UNSIGNED NOT NULL,
    tier_id INT UNSIGNED NULL,
    slug VARCHAR(120) NOT NULL,
    status ENUM('draft','active','suspended','cancelled') NOT NULL DEFAULT 'draft',
    qr_limit INT UNSIGNED NOT NULL DEFAULT 0,
    session_days INT UNSIGNED NOT NULL DEFAULT 30,
    magic_link_minutes INT UNSIGNED NOT NULL DEFAULT 30,
    settings_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_qr_agencies_business (business_id),
    UNIQUE KEY uq_tags_qr_agencies_slug (slug),
    KEY idx_tags_qr_agencies_status (status),
    KEY idx_tags_qr_agencies_tier (tier_id),
    CONSTRAINT fk_tags_qr_agencies_tier
        FOREIGN KEY (tier_id) REFERENCES tags_qr_agency_tiers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @qr_agency_has_tier := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tags_qr_agencies' AND COLUMN_NAME='tier_id'
);
SET @qr_agency_add_tier := IF(
    @qr_agency_has_tier=0,
    'ALTER TABLE tags_qr_agencies ADD COLUMN tier_id INT UNSIGNED NULL AFTER digital_product_id, ADD KEY idx_tags_qr_agencies_tier (tier_id), ADD CONSTRAINT fk_tags_qr_agencies_tier FOREIGN KEY (tier_id) REFERENCES tags_qr_agency_tiers(id)',
    'SELECT 1'
);
PREPARE qr_agency_stmt FROM @qr_agency_add_tier;
EXECUTE qr_agency_stmt;
DEALLOCATE PREPARE qr_agency_stmt;

CREATE TABLE IF NOT EXISTS tags_qr_agency_customers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    agency_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    email VARCHAR(190) NOT NULL,
    email_normalized VARCHAR(190) NOT NULL,
    phone VARCHAR(60) NULL,
    status ENUM('active','suspended','archived') NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    last_access_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_qr_agency_customer_email (agency_id, email_normalized),
    KEY idx_tags_qr_agency_customers_status (agency_id, status, name),
    CONSTRAINT fk_tags_qr_agency_customers_agency
        FOREIGN KEY (agency_id) REFERENCES tags_qr_agencies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_qr_agency_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    agency_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    qr_code_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active','paused','archived') NOT NULL DEFAULT 'active',
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_qr_agency_assignment_qr (qr_code_id),
    KEY idx_tags_qr_agency_assignments_customer (customer_id, status),
    KEY idx_tags_qr_agency_assignments_usage (agency_id, status),
    CONSTRAINT fk_tags_qr_agency_assignments_agency
        FOREIGN KEY (agency_id) REFERENCES tags_qr_agencies(id) ON DELETE CASCADE,
    CONSTRAINT fk_tags_qr_agency_assignments_customer
        FOREIGN KEY (customer_id) REFERENCES tags_qr_agency_customers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_qr_agency_access_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    agency_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    purpose ENUM('login','email_change','support') NOT NULL DEFAULT 'login',
    requested_ip_hash CHAR(64) NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_qr_agency_access_token (token_hash),
    KEY idx_tags_qr_agency_access_customer (customer_id, purpose, expires_at),
    CONSTRAINT fk_tags_qr_agency_access_agency
        FOREIGN KEY (agency_id) REFERENCES tags_qr_agencies(id) ON DELETE CASCADE,
    CONSTRAINT fk_tags_qr_agency_access_customer
        FOREIGN KEY (customer_id) REFERENCES tags_qr_agency_customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_qr_agency_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    agency_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    session_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    last_seen_at DATETIME NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_qr_agency_session_hash (session_hash),
    KEY idx_tags_qr_agency_sessions_customer (customer_id, expires_at, revoked_at),
    CONSTRAINT fk_tags_qr_agency_sessions_agency
        FOREIGN KEY (agency_id) REFERENCES tags_qr_agencies(id) ON DELETE CASCADE,
    CONSTRAINT fk_tags_qr_agency_sessions_customer
        FOREIGN KEY (customer_id) REFERENCES tags_qr_agency_customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_qr_agency_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    agency_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    qr_code_id BIGINT UNSIGNED NULL,
    actor_type ENUM('platform','agency','customer','system') NOT NULL,
    actor_id VARCHAR(100) NULL,
    action VARCHAR(100) NOT NULL,
    before_json JSON NULL,
    after_json JSON NULL,
    ip_hash CHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_qr_agency_audit_agency (agency_id, created_at),
    KEY idx_tags_qr_agency_audit_customer (customer_id, created_at),
    KEY idx_tags_qr_agency_audit_qr (qr_code_id, created_at),
    CONSTRAINT fk_tags_qr_agency_audit_agency
        FOREIGN KEY (agency_id) REFERENCES tags_qr_agencies(id) ON DELETE CASCADE,
    CONSTRAINT fk_tags_qr_agency_audit_customer
        FOREIGN KEY (customer_id) REFERENCES tags_qr_agency_customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificación manual sugerida después de ejecutar:
-- SELECT code,name,max_qr_codes,price FROM tags_plans WHERE code LIKE 'agency%';
-- SELECT code,name FROM tags_addons WHERE code='qr_agency';
-- SHOW TABLES LIKE 'tags_qr_agency%';
