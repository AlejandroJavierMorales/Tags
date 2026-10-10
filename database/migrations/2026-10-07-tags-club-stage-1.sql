-- Tags Club - Etapa 1
-- Puede ejecutarse nuevamente si una ejecución anterior quedó incompleta.
-- No elimina ni reemplaza datos deportivos existentes.
-- Conserva sports_club y tags_sports_* como contratos internos compatibles.

INSERT INTO tags_addons (
    code, name, description, default_quantity, price, currency,
    is_active, is_public, sort_order, created_at
)
VALUES (
    'club',
    'Tags Club',
    'Gestión de clubes deportivos, canchas, clases, profesores, comunidad, torneos y rankings.',
    1, 0, 'ARS', 1, 1, 45, NOW()
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    is_active = 1,
    is_public = VALUES(is_public);

-- Compatibilidad con MySQL/MariaDB que no admiten ADD COLUMN IF NOT EXISTS.
-- Cada bloque ignora exclusivamente el error 1060 (columna ya existente).
DELIMITER $$

DROP PROCEDURE IF EXISTS tags_club_stage1_add_columns$$
CREATE PROCEDURE tags_club_stage1_add_columns()
BEGIN
    BEGIN
        DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
        ALTER TABLE tags_sports_apps
            ADD COLUMN description TEXT NULL AFTER name;
    END;

    BEGIN
        DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
        ALTER TABLE tags_sports_apps
            ADD COLUMN logo_url VARCHAR(2000) NULL AFTER description;
    END;

    BEGIN
        DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
        ALTER TABLE tags_sports_apps
            ADD COLUMN cover_url VARCHAR(2000) NULL AFTER logo_url;
    END;

    BEGIN
        DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
        ALTER TABLE tags_sports_apps
            ADD COLUMN public_visibility VARCHAR(30) NOT NULL DEFAULT 'public' AFTER public_community_enabled;
    END;
END$$

CALL tags_club_stage1_add_columns()$$
DROP PROCEDURE IF EXISTS tags_club_stage1_add_columns$$

DELIMITER ;

UPDATE tags_turnos_profiles
SET name = 'Tags Club',
    description = 'Gestión integral para clubes y complejos deportivos'
WHERE code = 'sports_club';

UPDATE tags_turnos_permissions
SET module_name = 'Tags Club'
WHERE id > 0
  AND module_key = 'sports';

INSERT INTO tags_turnos_permissions (code, module_key, module_name, description)
VALUES
    ('sports.settings.view', 'sports', 'Tags Club', 'Consultar la configuración del club'),
    ('sports.settings.manage', 'sports', 'Tags Club', 'Modificar la configuración del club'),
    ('sports.publication.manage', 'sports', 'Tags Club', 'Administrar la publicación del club')
ON DUPLICATE KEY UPDATE
    module_name = VALUES(module_name),
    description = VALUES(description);

INSERT IGNORE INTO tags_turnos_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM tags_turnos_roles r
INNER JOIN tags_turnos_apps a ON a.id = r.turnos_id
CROSS JOIN tags_turnos_permissions p
WHERE r.code = 'administrator'
  AND a.business_profile_code = 'sports_club'
  AND p.code IN (
      'sports.settings.view',
      'sports.settings.manage',
      'sports.publication.manage'
  );

INSERT IGNORE INTO tags_sports_disciplines
    (sports_app_id, code, name, description, team_mode, scoring_mode, is_active, sort_order)
SELECT id, 'pickleball', 'Pickleball', NULL, 'doubles', 'sets', 1, 40
FROM tags_sports_apps;
