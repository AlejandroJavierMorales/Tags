-- Tags Club - Etapa 2B: consentimiento del registro público. Reejecutable.
DROP PROCEDURE IF EXISTS tags_club_add_public_access_columns;
DELIMITER $$
CREATE PROCEDURE tags_club_add_public_access_columns()
BEGIN
    DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
    ALTER TABLE tags_club_players ADD COLUMN privacy_consent_at DATETIME NULL AFTER status;
END$$
DELIMITER ;
CALL tags_club_add_public_access_columns();
DROP PROCEDURE IF EXISTS tags_club_add_public_access_columns;
