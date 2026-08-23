-- Chatbot con IA: documentos personalizados por negocio.
-- Ejecutar después de las migraciones del addon y de configuración.
-- business_id usa INT para coincidir con tags_businesses.id.

CREATE TABLE IF NOT EXISTS tags_ai_chatbot_knowledge (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    topics VARCHAR(500) NULL,
    content MEDIUMTEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_ai_chatbot_knowledge_business_slug (business_id,slug),
    KEY idx_tags_ai_chatbot_knowledge_business_active (business_id,is_active,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
