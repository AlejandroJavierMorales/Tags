-- Tags AI Chatbot: consumo técnico y límites comerciales.
-- Ejecutar en desarrollo y luego en producción.
-- No usa claves foráneas para mantener compatibilidad con las instalaciones
-- existentes, donde los tipos de IDs pueden variar.

CREATE TABLE IF NOT EXISTS tags_ai_chatbot_usage (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id INT NULL,
  request_id CHAR(36) NOT NULL,
  model VARCHAR(120) NULL,
  source VARCHAR(40) NOT NULL DEFAULT 'public',
  status ENUM('completed','failed','blocked') NOT NULL DEFAULT 'completed',
  input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  total_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  estimated_cost_usd DECIMAL(14,8) NOT NULL DEFAULT 0,
  error_code VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_ai_chatbot_usage_request (request_id),
  KEY idx_tags_ai_chatbot_usage_business_date (business_id,created_at),
  KEY idx_tags_ai_chatbot_usage_status_date (status,created_at),
  KEY idx_tags_ai_chatbot_usage_model_date (model,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_ai_chatbot_plan_limits (
  plan_id INT NOT NULL,
  monthly_response_limit INT UNSIGNED NOT NULL DEFAULT 0,
  settings_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id),
  KEY idx_tags_ai_chatbot_plan_limits_limit (monthly_response_limit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si ya existen los planes, estos códigos los dejan configurados automáticamente.
INSERT INTO tags_ai_chatbot_plan_limits (plan_id,monthly_response_limit)
SELECT id,300 FROM tags_plans WHERE code='chat_300'
ON DUPLICATE KEY UPDATE monthly_response_limit=VALUES(monthly_response_limit),updated_at=NOW();

INSERT INTO tags_ai_chatbot_plan_limits (plan_id,monthly_response_limit)
SELECT id,1000 FROM tags_plans WHERE code='chat_1000'
ON DUPLICATE KEY UPDATE monthly_response_limit=VALUES(monthly_response_limit),updated_at=NOW();

INSERT INTO tags_ai_chatbot_plan_limits (plan_id,monthly_response_limit)
SELECT id,5000 FROM tags_plans WHERE code='chat_5000'
ON DUPLICATE KEY UPDATE monthly_response_limit=VALUES(monthly_response_limit),updated_at=NOW();
