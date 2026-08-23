-- Tags: Centro Integral de Suscripciones y Pagos - fundación compatible.
-- Esta migración NO modifica las tablas operativas existentes y NO incorpora
-- claves foráneas: los tipos históricos de IDs difieren entre instalaciones.
-- Ejecutar primero en desarrollo. La aplicación no ejecuta migraciones.

CREATE TABLE IF NOT EXISTS tags_plan_profiles (
  plan_id INT NOT NULL,
  visibility ENUM('public','private') NOT NULL DEFAULT 'public',
  owner_business_id INT NULL,
  current_version_id BIGINT UNSIGNED NULL,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  settings_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id),
  KEY idx_tags_plan_profiles_owner (owner_business_id,status),
  KEY idx_tags_plan_profiles_visibility (visibility,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_plan_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id INT NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  name VARCHAR(190) NOT NULL,
  description TEXT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  status ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  billing_config_json JSON NULL,
  feature_snapshot_json JSON NULL,
  created_by INT NULL,
  activated_at DATETIME NULL,
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_plan_versions_number (plan_id,version_number),
  KEY idx_tags_plan_versions_status (plan_id,status,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_plan_version_addons (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_version_id BIGINT UNSIGNED NOT NULL,
  addon_code VARCHAR(80) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  entitlement_config_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_plan_version_addon (plan_version_id,addon_code),
  KEY idx_tags_plan_version_addons_code (addon_code,plan_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_plan_version_prices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_version_id BIGINT UNSIGNED NOT NULL,
  price_code VARCHAR(80) NOT NULL,
  billing_mode ENUM('manual','recurring') NOT NULL,
  provider VARCHAR(40) NULL,
  duration_months INT UNSIGNED NOT NULL DEFAULT 1,
  calendar_month TINYINT UNSIGNED NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  settings_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_plan_version_price (plan_version_id,price_code),
  KEY idx_tags_plan_version_prices_lookup (plan_version_id,billing_mode,is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_plan_business_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id INT NOT NULL,
  business_id INT NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  assigned_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_plan_business_assignment (plan_id,business_id),
  KEY idx_tags_plan_business_assignments_business (business_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_subscription_offers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id INT NULL,
  customer_email VARCHAR(190) NULL,
  plan_id INT NOT NULL,
  plan_version_id BIGINT UNSIGNED NOT NULL,
  price_id BIGINT UNSIGNED NULL,
  status ENUM('draft','sent','opened','accepted','expired','cancelled') NOT NULL DEFAULT 'draft',
  billing_mode ENUM('manual','recurring') NOT NULL,
  payment_provider VARCHAR(40) NOT NULL DEFAULT 'manual',
  duration_months INT UNSIGNED NOT NULL DEFAULT 1,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  subscription_id INT NULL,
  created_by INT NULL,
  terms_snapshot_json JSON NOT NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_subscription_offers_token (token_hash),
  KEY idx_tags_subscription_offers_business (business_id,status,expires_at),
  KEY idx_tags_subscription_offers_status (status,expires_at),
  KEY idx_tags_subscription_offers_subscription (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_subscription_terms (
  subscription_id INT NOT NULL,
  plan_version_id BIGINT UNSIGNED NULL,
  offer_id BIGINT UNSIGNED NULL,
  price_code VARCHAR(80) NULL,
  billing_mode ENUM('manual','recurring','complimentary','admin') NOT NULL DEFAULT 'manual',
  terms_snapshot_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (subscription_id),
  KEY idx_tags_subscription_terms_version (plan_version_id),
  KEY idx_tags_subscription_terms_offer (offer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_subscription_addon_grants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subscription_id INT NOT NULL,
  business_id INT NOT NULL,
  business_addon_id INT NULL,
  addon_code VARCHAR(80) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('pending','active','suspended','expired','cancelled') NOT NULL DEFAULT 'pending',
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  entitlement_snapshot_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_subscription_addon_grant (subscription_id,addon_code),
  KEY idx_tags_subscription_addon_grants_business (business_id,status),
  KEY idx_tags_subscription_addon_grants_addon (addon_code,status),
  KEY idx_tags_subscription_addon_grants_business_addon (business_addon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_subscription_provider_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider VARCHAR(40) NOT NULL,
  event_key VARCHAR(190) NOT NULL,
  event_type VARCHAR(100) NULL,
  resource_id VARCHAR(190) NULL,
  subscription_id INT NULL,
  processing_status ENUM('received','processed','ignored','failed') NOT NULL DEFAULT 'received',
  request_id VARCHAR(190) NULL,
  payload_json JSON NULL,
  error_message TEXT NULL,
  processed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_subscription_provider_event (provider,event_key),
  KEY idx_tags_subscription_provider_events_status (provider,processing_status,created_at),
  KEY idx_tags_subscription_provider_events_subscription (subscription_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_subscription_audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subscription_id INT NULL,
  business_id INT NULL,
  offer_id BIGINT UNSIGNED NULL,
  event_code VARCHAR(100) NOT NULL,
  actor_type ENUM('system','admin','business','customer','provider') NOT NULL DEFAULT 'system',
  actor_id INT NULL,
  idempotency_key VARCHAR(190) NULL,
  previous_state_json JSON NULL,
  next_state_json JSON NULL,
  context_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_subscription_audit_idempotency (idempotency_key),
  KEY idx_tags_subscription_audit_subscription (subscription_id,created_at),
  KEY idx_tags_subscription_audit_business (business_id,created_at),
  KEY idx_tags_subscription_audit_event (event_code,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
