-- Tags Directory: suscripciones automáticas de Mercado Pago
-- Incremental. Ejecutar primero en desarrollo. No elimina ni transforma pagos manuales.

ALTER TABLE tags_subscriptions
  ADD COLUMN provider_status VARCHAR(50) NULL AFTER external_subscription_id,
  ADD COLUMN provider_init_point TEXT NULL AFTER provider_status,
  ADD COLUMN provider_next_payment_at DATETIME NULL AFTER provider_init_point,
  ADD COLUMN provider_last_synced_at DATETIME NULL AFTER provider_next_payment_at,
  ADD COLUMN provider_payload JSON NULL AFTER provider_last_synced_at,
  ADD KEY idx_tags_subscriptions_provider (payment_provider,provider_status),
  ADD KEY idx_tags_subscriptions_external (external_subscription_id);

ALTER TABLE tags_subscription_payments
  ADD COLUMN provider_invoice_id VARCHAR(255) NULL AFTER provider,
  ADD COLUMN provider_payment_id VARCHAR(255) NULL AFTER provider_invoice_id,
  ADD COLUMN provider_status VARCHAR(80) NULL AFTER provider_payment_id,
  ADD COLUMN raw_response_json JSON NULL AFTER provider_status,
  ADD COLUMN updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD UNIQUE KEY uq_tags_subscription_payment_invoice (provider,provider_invoice_id),
  ADD KEY idx_tags_subscription_payment_external (provider,provider_payment_id);

CREATE TABLE IF NOT EXISTS tags_subscription_provider_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider VARCHAR(40) NOT NULL,
  event_key VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NULL,
  resource_id VARCHAR(255) NULL,
  subscription_id INT NULL,
  processing_status ENUM('received','processed','ignored','failed') NOT NULL DEFAULT 'received',
  request_id VARCHAR(255) NULL,
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

