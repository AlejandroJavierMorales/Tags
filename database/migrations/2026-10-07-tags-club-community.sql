-- Tags Club - Etapa 2: comunidad, jugadores, socios y categorías.
-- Reejecutable. No agrega claves foráneas contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_club_players (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    business_id BIGINT UNSIGNED NOT NULL,
    turnos_customer_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NULL,
    member_number VARCHAR(80) NULL,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    display_name VARCHAR(190) NULL,
    email VARCHAR(190) NULL,
    phone VARCHAR(60) NULL,
    document VARCHAR(80) NULL,
    date_of_birth DATE NULL,
    gender_code VARCHAR(40) NULL,
    photo_url VARCHAR(2000) NULL,
    guardian_name VARCHAR(190) NULL,
    guardian_phone VARCHAR(60) NULL,
    notes TEXT NULL,
    profile_visibility VARCHAR(30) NOT NULL DEFAULT 'private',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_club_player_member (sports_app_id, member_number),
    KEY idx_tags_club_players_app (sports_app_id, status, last_name, first_name),
    KEY idx_tags_club_players_business (business_id),
    KEY idx_tags_club_players_customer (turnos_customer_id),
    KEY idx_tags_club_players_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_club_memberships (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    player_id BIGINT UNSIGNED NOT NULL,
    membership_type VARCHAR(120) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    valid_from DATE NULL,
    valid_until DATE NULL,
    notes VARCHAR(1000) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_club_memberships_player (sports_app_id, player_id, status),
    KEY idx_tags_club_memberships_dates (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_club_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    discipline_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(80) NOT NULL,
    description VARCHAR(500) NULL,
    category_kind VARCHAR(40) NOT NULL DEFAULT 'level',
    min_age INT NULL,
    max_age INT NULL,
    gender_code VARCHAR(40) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_club_category_code (sports_app_id, discipline_id, code),
    KEY idx_tags_club_categories_app (sports_app_id, discipline_id, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_club_player_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    player_id BIGINT UNSIGNED NOT NULL,
    discipline_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,
    notes VARCHAR(500) NULL,
    PRIMARY KEY (id),
    KEY idx_tags_club_player_category_state (player_id, discipline_id, category_id, status),
    KEY idx_tags_club_player_categories_app (sports_app_id, discipline_id, category_id),
    KEY idx_tags_club_player_categories_player (player_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tags_turnos_permissions (code, module_key, module_name, description)
VALUES
    ('sports.players.view', 'sports', 'Tags Club', 'Consultar jugadores y socios'),
    ('sports.players.manage', 'sports', 'Tags Club', 'Administrar jugadores y socios'),
    ('sports.categories.view', 'sports', 'Tags Club', 'Consultar categorías deportivas'),
    ('sports.categories.manage', 'sports', 'Tags Club', 'Administrar categorías deportivas')
ON DUPLICATE KEY UPDATE
    module_name = VALUES(module_name),
    description = VALUES(description);

INSERT IGNORE INTO tags_turnos_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM tags_turnos_roles r
INNER JOIN tags_turnos_apps a ON a.id=r.turnos_id
CROSS JOIN tags_turnos_permissions p
WHERE r.code='administrator'
  AND a.business_profile_code='sports_club'
  AND p.code IN ('sports.players.view','sports.players.manage','sports.categories.view','sports.categories.manage');
