-- Tags Club - Etapa 5: fixture, partidos y resultados. Reejecutable.

CREATE TABLE IF NOT EXISTS tags_club_tournament_rounds (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    tournament_id BIGINT UNSIGNED NOT NULL,
    stage_code VARCHAR(40) NOT NULL DEFAULT 'main',
    round_number INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_club_round (tournament_id,stage_code,round_number),
    KEY idx_tags_club_rounds_app (sports_app_id,tournament_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_club_matches (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    tournament_id BIGINT UNSIGNED NOT NULL,
    round_id BIGINT UNSIGNED NOT NULL,
    match_number INT NOT NULL,
    participant_a_registration_id BIGINT UNSIGNED NULL,
    participant_b_registration_id BIGINT UNSIGNED NULL,
    source_match_a_id BIGINT UNSIGNED NULL,
    source_match_b_id BIGINT UNSIGNED NULL,
    winner_registration_id BIGINT UNSIGNED NULL,
    location_id BIGINT UNSIGNED NULL,
    resource_id BIGINT UNSIGNED NULL,
    court_name VARCHAR(190) NULL,
    scheduled_at DATETIME NULL,
    score_a DECIMAL(10,2) NULL,
    score_b DECIMAL(10,2) NULL,
    score_detail_json LONGTEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    notes VARCHAR(2000) NULL,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_club_match_number (tournament_id,match_number),
    KEY idx_tags_club_matches_round (sports_app_id,tournament_id,round_id,status),
    KEY idx_tags_club_matches_schedule (scheduled_at,location_id,resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tags_turnos_permissions (code,module_key,module_name,description) VALUES
('sports.matches.view','sports','Tags Club','Consultar fixture y resultados'),
('sports.matches.manage','sports','Tags Club','Generar fixture y administrar partidos')
ON DUPLICATE KEY UPDATE module_name=VALUES(module_name),description=VALUES(description);

INSERT IGNORE INTO tags_turnos_role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM tags_turnos_roles r INNER JOIN tags_turnos_apps a ON a.id=r.turnos_id CROSS JOIN tags_turnos_permissions p
WHERE r.code='administrator' AND a.business_profile_code='sports_club' AND p.code IN ('sports.matches.view','sports.matches.manage');
