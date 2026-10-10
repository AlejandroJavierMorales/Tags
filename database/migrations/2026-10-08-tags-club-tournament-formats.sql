-- Tags Club - ampliación de formatos, ramas y grupos. Reejecutable.
DROP PROCEDURE IF EXISTS tags_club_add_tournament_format_columns;
DELIMITER $$
CREATE PROCEDURE tags_club_add_tournament_format_columns()
BEGIN
    DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
    ALTER TABLE tags_club_tournaments ADD COLUMN gender_mode VARCHAR(30) NOT NULL DEFAULT 'mixed' AFTER competition_mode;
    ALTER TABLE tags_club_tournaments ADD COLUMN group_count INT NULL AFTER format_code;
    ALTER TABLE tags_club_tournaments ADD COLUMN qualifiers_per_group INT NULL AFTER group_count;
    ALTER TABLE tags_club_matches ADD COLUMN source_outcome_a VARCHAR(20) NOT NULL DEFAULT 'winner' AFTER source_match_a_id;
    ALTER TABLE tags_club_matches ADD COLUMN source_outcome_b VARCHAR(20) NOT NULL DEFAULT 'winner' AFTER source_match_b_id;
END$$
DELIMITER ;
CALL tags_club_add_tournament_format_columns();
DROP PROCEDURE IF EXISTS tags_club_add_tournament_format_columns;

CREATE TABLE IF NOT EXISTS tags_club_tournament_groups (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    tournament_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(80) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    qualifiers_count INT NOT NULL DEFAULT 2,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_club_tournament_group (tournament_id,name),
    KEY idx_tags_club_tournament_groups (sports_app_id,tournament_id,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_club_tournament_group_members (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    tournament_id BIGINT UNSIGNED NOT NULL,
    group_id BIGINT UNSIGNED NOT NULL,
    registration_id BIGINT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_club_group_registration (tournament_id,registration_id),
    KEY idx_tags_club_group_members (sports_app_id,group_id,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
