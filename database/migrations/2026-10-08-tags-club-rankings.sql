-- Tags Club - clasificación y ranking. Reejecutable.
CREATE TABLE IF NOT EXISTS tags_club_ranking_rules (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sports_app_id BIGINT UNSIGNED NOT NULL,
    discipline_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NULL,
    gender_mode VARCHAR(30) NOT NULL DEFAULT 'mixed',
    name VARCHAR(150) NOT NULL,
    points_win DECIMAL(10,2) NOT NULL DEFAULT 3,
    points_loss DECIMAL(10,2) NOT NULL DEFAULT 0,
    points_walkover_win DECIMAL(10,2) NOT NULL DEFAULT 3,
    points_walkover_loss DECIMAL(10,2) NOT NULL DEFAULT 0,
    tiebreak_order_json LONGTEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_club_ranking_rules (sports_app_id,discipline_id,category_id,is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS tags_club_add_ranking_rule_column;
DELIMITER $$
CREATE PROCEDURE tags_club_add_ranking_rule_column()
BEGIN
    DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
    ALTER TABLE tags_club_tournaments ADD COLUMN ranking_rule_id BIGINT UNSIGNED NULL AFTER match_format_id;
END$$
DELIMITER ;
CALL tags_club_add_ranking_rule_column();
DROP PROCEDURE IF EXISTS tags_club_add_ranking_rule_column;

INSERT INTO tags_turnos_permissions (code,module_key,module_name,description) VALUES
('sports.rankings.view','sports','Tags Club','Consultar clasificaciones y rankings'),
('sports.rankings.manage','sports','Tags Club','Administrar reglas, clasificaciones y rankings')
ON DUPLICATE KEY UPDATE module_name=VALUES(module_name),description=VALUES(description);

INSERT IGNORE INTO tags_turnos_role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM tags_turnos_roles r INNER JOIN tags_turnos_apps a ON a.id=r.turnos_id CROSS JOIN tags_turnos_permissions p
WHERE r.code='administrator' AND a.business_profile_code='sports_club' AND p.code IN ('sports.rankings.view','sports.rankings.manage');
