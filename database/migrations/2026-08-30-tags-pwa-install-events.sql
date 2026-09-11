-- Registro anónimo de instalaciones confirmadas de aplicaciones PWA.
-- No guarda cuentas ni crea una relación con clientes.
CREATE TABLE IF NOT EXISTS tags_pwa_install_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    app_code VARCHAR(80) NOT NULL,
    installation_id VARCHAR(180) NOT NULL,
    public_host VARCHAR(255) NULL,
    platform VARCHAR(120) NULL,
    user_agent TEXT NULL,
    outcome ENUM('installed','cancelled') NOT NULL DEFAULT 'installed',
    prompt_count INT UNSIGNED NOT NULL DEFAULT 1,
    installed_at DATETIME NULL,
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_pwa_install_app_installation (app_code, installation_id),
    KEY idx_tags_pwa_install_app_date (app_code, installed_at),
    KEY idx_tags_pwa_install_host (public_host),
    KEY idx_tags_pwa_install_outcome (app_code, outcome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compatibilidad con servidores MySQL/MariaDB que no admiten
-- ADD COLUMN IF NOT EXISTS dentro de ALTER TABLE.
ALTER TABLE tags_pwa_install_events
    MODIFY COLUMN installed_at DATETIME NULL;

SET @add_outcome_sql = (
    SELECT IF(
        COUNT(*) > 0,
        'SELECT 1',
        'ALTER TABLE tags_pwa_install_events ADD COLUMN outcome ENUM(''installed'',''cancelled'') NOT NULL DEFAULT ''installed'' AFTER user_agent'
    )
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'tags_pwa_install_events'
      AND column_name = 'outcome'
);
PREPARE add_outcome_statement FROM @add_outcome_sql;
EXECUTE add_outcome_statement;
DEALLOCATE PREPARE add_outcome_statement;

SET @add_prompt_count_sql = (
    SELECT IF(
        COUNT(*) > 0,
        'SELECT 1',
        'ALTER TABLE tags_pwa_install_events ADD COLUMN prompt_count INT UNSIGNED NOT NULL DEFAULT 1 AFTER outcome'
    )
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'tags_pwa_install_events'
      AND column_name = 'prompt_count'
);
PREPARE add_prompt_count_statement FROM @add_prompt_count_sql;
EXECUTE add_prompt_count_statement;
DEALLOCATE PREPARE add_prompt_count_statement;
