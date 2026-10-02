-- ETAPA 1: Web Push transversal de Tags.
-- Ejecutar primero en desarrollo y luego en producción, únicamente después de aprobarlo.
-- Sin claves foráneas contra tablas legacy: business_id y recipient_id se validan en servidor.

CREATE TABLE IF NOT EXISTS tags_push_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT UNSIGNED NOT NULL,
  recipient_type VARCHAR(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  recipient_id BIGINT UNSIGNED DEFAULT NULL,
  endpoint TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  endpoint_hash CHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  p256dh VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  auth_secret VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  user_agent VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  status VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  last_seen_at DATETIME DEFAULT NULL,
  last_success_at DATETIME DEFAULT NULL,
  last_failure_at DATETIME DEFAULT NULL,
  failure_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_push_endpoint_hash (endpoint_hash),
  KEY idx_tags_push_business_status (business_id,status),
  KEY idx_tags_push_recipient (recipient_type,recipient_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_notification_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT UNSIGNED NOT NULL,
  module_code VARCHAR(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  event_code VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  entity_type VARCHAR(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  entity_id BIGINT UNSIGNED DEFAULT NULL,
  title VARCHAR(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  body VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  action_url VARCHAR(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  payload_json JSON DEFAULT NULL,
  priority VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  idempotency_key VARCHAR(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_notification_event_key (idempotency_key),
  KEY idx_tags_notification_events_business (business_id,created_at),
  KEY idx_tags_notification_events_entity (module_code,entity_type,entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_notification_deliveries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  push_subscription_id BIGINT UNSIGNED NOT NULL,
  channel VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web_push',
  status VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  provider_status INT DEFAULT NULL,
  last_error VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  sent_at DATETIME DEFAULT NULL,
  failed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_notification_delivery (event_id,push_subscription_id,channel),
  KEY idx_tags_notification_deliveries_status (status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
