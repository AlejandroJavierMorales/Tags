-- Tags Club - Etapa 4: torneos e inscripciones. Reejecutable.
-- Sin claves foráneas contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_club_tournaments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    discipline_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NULL,
    name VARCHAR(190) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    description TEXT NULL,
    competition_mode VARCHAR(30) NOT NULL DEFAULT 'individual',
    format_code VARCHAR(40) NOT NULL DEFAULT 'elimination',
    location_id BIGINT UNSIGNED NULL,
    venue_name VARCHAR(190) NULL,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    registration_opens_at DATETIME NULL,
    registration_closes_at DATETIME NULL,
    capacity INT NULL,
    registration_mode VARCHAR(30) NOT NULL DEFAULT 'approval',
    visibility VARCHAR(30) NOT NULL DEFAULT 'public',
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    rules_text MEDIUMTEXT NULL,
    cover_url VARCHAR(2000) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_club_tournament_slug (sports_app_id,slug),
    KEY idx_tags_club_tournaments_app (sports_app_id,status,starts_at),
    KEY idx_tags_club_tournaments_discipline (discipline_id,category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_club_tournament_registrations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    tournament_id BIGINT UNSIGNED NOT NULL,
    participant_type VARCHAR(30) NOT NULL,
    participant_id BIGINT UNSIGNED NOT NULL,
    participant_key VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    seed_number INT NULL,
    notes VARCHAR(2000) NULL,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_club_tournament_participant (tournament_id,participant_key),
    KEY idx_tags_club_tournament_registrations (sports_app_id,tournament_id,status),
    KEY idx_tags_club_tournament_participant (participant_type,participant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tags_turnos_permissions (code,module_key,module_name,description) VALUES
('sports.tournaments.view','sports','Tags Club','Consultar torneos e inscripciones'),
('sports.tournaments.manage','sports','Tags Club','Administrar torneos e inscripciones')
ON DUPLICATE KEY UPDATE module_name=VALUES(module_name),description=VALUES(description);

INSERT IGNORE INTO tags_turnos_role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM tags_turnos_roles r
INNER JOIN tags_turnos_apps a ON a.id=r.turnos_id
CROSS JOIN tags_turnos_permissions p
WHERE r.code='administrator' AND a.business_profile_code='sports_club'
AND p.code IN ('sports.tournaments.view','sports.tournaments.manage');
