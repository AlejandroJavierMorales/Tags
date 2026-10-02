-- Segunda etapa de Audiencia: historial de entregas y conexión de Search Console.

CREATE TABLE IF NOT EXISTS tags_audience_report_deliveries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NULL,
  business_id BIGINT NULL,
  period_days INT UNSIGNED NOT NULL,
  channel ENUM('email','whatsapp') NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status ENUM('prepared','sent','error') NOT NULL DEFAULT 'prepared',
  summary_json LONGTEXT NULL,
  error_message VARCHAR(1500) NULL,
  created_by_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_tags_audience_delivery_business (business_id,created_at),
  KEY idx_tags_audience_delivery_site (site_id,created_at),
  KEY idx_tags_audience_delivery_status (status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_search_console_connections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  connection_key VARCHAR(60) NOT NULL DEFAULT 'platform',
  google_user_email VARCHAR(255) NULL,
  encrypted_access_token LONGTEXT NULL,
  encrypted_refresh_token LONGTEXT NULL,
  token_expires_at DATETIME NULL,
  granted_scope TEXT NULL,
  sites_json LONGTEXT NULL,
  selected_site_url VARCHAR(500) NULL,
  connection_status ENUM('connected','error','disconnected') NOT NULL DEFAULT 'connected',
  last_error VARCHAR(1500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_search_console_connection_key (connection_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
