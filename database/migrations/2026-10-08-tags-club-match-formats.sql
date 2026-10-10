-- Tags Club - formatos configurables y resultados set a set. Reejecutable.
CREATE TABLE IF NOT EXISTS tags_club_match_formats (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    discipline_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    scoring_type VARCHAR(30) NOT NULL DEFAULT 'racket_sets',
    best_of_sets INT NOT NULL DEFAULT 3,
    games_to_win_set INT NOT NULL DEFAULT 6,
    minimum_game_difference INT NOT NULL DEFAULT 2,
    tiebreak_enabled TINYINT(1) NOT NULL DEFAULT 1,
    tiebreak_at_games INT NULL DEFAULT 6,
    tiebreak_points INT NOT NULL DEFAULT 7,
    deciding_set_mode VARCHAR(30) NOT NULL DEFAULT 'conventional',
    deciding_tiebreak_points INT NOT NULL DEFAULT 10,
    game_mode VARCHAR(30) NOT NULL DEFAULT 'advantage',
    allow_draw TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_club_match_formats (sports_app_id,discipline_id,is_active,name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_club_match_sets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    tournament_id BIGINT UNSIGNED NOT NULL,
    match_id BIGINT UNSIGNED NOT NULL,
    set_number INT NOT NULL,
    set_type VARCHAR(30) NOT NULL DEFAULT 'conventional',
    score_a INT NOT NULL,
    score_b INT NOT NULL,
    tiebreak_score_a INT NULL,
    tiebreak_score_b INT NULL,
    winner_side VARCHAR(1) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_club_match_set (match_id,set_number),
    KEY idx_tags_club_match_sets_tournament (sports_app_id,tournament_id,match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS tags_club_add_match_format_columns;
DELIMITER $$
CREATE PROCEDURE tags_club_add_match_format_columns()
BEGIN
    DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
    ALTER TABLE tags_club_tournaments ADD COLUMN match_format_id BIGINT UNSIGNED NULL AFTER qualifiers_per_group;
    ALTER TABLE tags_club_tournament_rounds ADD COLUMN match_format_id BIGINT UNSIGNED NULL AFTER stage_code;
    ALTER TABLE tags_club_matches ADD COLUMN match_format_id BIGINT UNSIGNED NULL AFTER round_id;
    ALTER TABLE tags_club_matches ADD COLUMN result_outcome VARCHAR(30) NULL AFTER score_detail_json;
END$$
DELIMITER ;
CALL tags_club_add_match_format_columns();
DROP PROCEDURE IF EXISTS tags_club_add_match_format_columns;

INSERT INTO tags_turnos_permissions (code,module_key,module_name,description) VALUES
('sports.match_formats.view','sports','Tags Club','Consultar formatos de partido'),
('sports.match_formats.manage','sports','Tags Club','Administrar formatos de partido')
ON DUPLICATE KEY UPDATE module_name=VALUES(module_name),description=VALUES(description);

INSERT IGNORE INTO tags_turnos_role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM tags_turnos_roles r INNER JOIN tags_turnos_apps a ON a.id=r.turnos_id CROSS JOIN tags_turnos_permissions p
WHERE r.code='administrator' AND a.business_profile_code='sports_club' AND p.code IN ('sports.match_formats.view','sports.match_formats.manage');
