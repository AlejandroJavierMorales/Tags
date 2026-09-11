-- Tags Deportes - Etapa 1
-- Ejecutar manualmente. No elimina ni modifica datos existentes.

CREATE TABLE IF NOT EXISTS tags_sports_apps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NOT NULL,
    turnos_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    default_discipline_id BIGINT UNSIGNED NULL,
    community_enabled TINYINT(1) NOT NULL DEFAULT 0,
    public_community_enabled TINYINT(1) NOT NULL DEFAULT 0,
    settings_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_sports_apps_turnos (turnos_id),
    KEY idx_tags_sports_apps_business (business_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_sports_disciplines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    team_mode VARCHAR(30) NOT NULL DEFAULT 'individual',
    scoring_mode VARCHAR(40) NOT NULL DEFAULT 'sets',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_sports_disciplines_code (sports_app_id, code),
    KEY idx_tags_sports_disciplines_active (sports_app_id, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_sports_resource_disciplines (
    sports_app_id BIGINT UNSIGNED NOT NULL,
    discipline_id BIGINT UNSIGNED NOT NULL,
    resource_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sports_app_id, discipline_id, resource_id),
    KEY idx_tags_sports_resource_discipline (discipline_id, resource_id),
    KEY idx_tags_sports_resource_resource (resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_sports_service_rates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    audience_type VARCHAR(30) NOT NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    deposit_policy_json JSON NULL,
    valid_from DATE NULL,
    valid_until DATE NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_sports_service_rate (sports_app_id, service_id, audience_type),
    KEY idx_tags_sports_service_rates_service (service_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tags_turnos_profiles
    (code, name, description, default_capabilities_json, is_active)
VALUES
    (
        'sports_club',
        'Tags Deportes',
        'Gestion integral para clubes y complejos deportivos',
        JSON_ARRAY('resource_rental', 'group_classes', 'customer_records', 'memberships', 'waitlist', 'packages'),
        1
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    default_capabilities_json = VALUES(default_capabilities_json),
    is_active = 1;

INSERT IGNORE INTO tags_turnos_permissions
    (code, module_key, module_name, description)
VALUES
    ('sports.dashboard.view', 'sports', 'Tags Deportes', 'Consultar el panel deportivo'),
    ('sports.disciplines.view', 'sports', 'Tags Deportes', 'Consultar disciplinas deportivas'),
    ('sports.disciplines.manage', 'sports', 'Tags Deportes', 'Administrar disciplinas deportivas'),
    ('sports.rates.view', 'sports', 'Tags Deportes', 'Consultar tarifas deportivas'),
    ('sports.rates.manage', 'sports', 'Tags Deportes', 'Administrar tarifas deportivas');

INSERT IGNORE INTO tags_turnos_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM tags_turnos_roles r
INNER JOIN tags_turnos_apps a ON a.id = r.turnos_id
CROSS JOIN tags_turnos_permissions p
WHERE r.code = 'administrator'
  AND p.code IN (
      'sports.dashboard.view',
      'sports.disciplines.view',
      'sports.disciplines.manage',
      'sports.rates.view',
      'sports.rates.manage'
  );
