-- Tags Chatbot con IA - configuración del widget por página pública
-- Ejecutar después de 2026-08-22-tags-ai-chatbot-settings.sql.
-- No usa FK polimórfica: surface_id puede referir a QR-Page, Store, Resto u otra página pública.

CREATE TABLE IF NOT EXISTS tags_ai_chatbot_surfaces (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id INT NOT NULL,
    surface_type VARCHAR(40) NOT NULL,
    surface_id BIGINT UNSIGNED NOT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 0,
    widget_type VARCHAR(30) NOT NULL DEFAULT 'bubble',
    position VARCHAR(20) NOT NULL DEFAULT 'right',
    primary_color VARCHAR(20) NOT NULL DEFAULT '#1f9d55',
    launcher_color VARCHAR(20) NOT NULL DEFAULT '#1f9d55',
    button_label VARCHAR(80) NULL,
    settings_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_ai_chatbot_surface (business_id,surface_type,surface_id),
    KEY idx_tags_ai_chatbot_surfaces_business (business_id,is_enabled),
    KEY idx_tags_ai_chatbot_surfaces_target (surface_type,surface_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
