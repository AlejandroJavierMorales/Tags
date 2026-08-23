-- Tags Chatbot con IA - configuración por cliente
-- Ejecutar después de 2026-08-22-tags-ai-chatbot-addon.sql.

CREATE TABLE IF NOT EXISTS tags_ai_chatbot_settings (
    business_id INT NOT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    title VARCHAR(120) NOT NULL DEFAULT 'Asistente de Tags',
    subtitle VARCHAR(180) NOT NULL DEFAULT 'Te ayudamos a conocer nuestras soluciones',
    greeting VARCHAR(500) NOT NULL DEFAULT 'Hola, soy el asistente. ¿En qué podemos ayudarte?',
    position VARCHAR(20) NOT NULL DEFAULT 'right',
    settings_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (business_id),
    KEY idx_tags_ai_chatbot_settings_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
