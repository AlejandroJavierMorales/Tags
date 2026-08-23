-- Tags Directory: planes y precios de suscripción
-- No ejecutar en producción hasta probar en desarrollo y verificar la estructura actual.
-- Reutiliza tags_plans y tags_subscriptions; no crea un sistema de suscripciones paralelo.

INSERT INTO tags_plans (
  code,name,description,price,currency,max_qr_codes,
  dashboard_enabled,reports_enabled,reports_email_enabled,
  reports_whatsapp_enabled,analytics_enabled,analytics_plus_enabled,
  allow_pause_qr,allow_edit_qr,priority_support,
  is_active,is_public,is_free,sort_order,created_at
) VALUES
('directory_web','Directorio Web','Ficha pública con contactos, redes, mapa, galería y catálogo básico.',0,'ARS',1,1,0,0,0,0,0,0,0,0,1,1,0,80,NOW()),
('directory_web_plus','Directorio Web Plus','Directorio Web más Tags Reviews y administración de reseñas.',0,'ARS',5,1,0,0,0,0,0,0,0,0,1,1,0,81,NOW())
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  description=VALUES(description),
  is_active=VALUES(is_active),
  is_public=VALUES(is_public),
  is_free=VALUES(is_free),
  sort_order=VALUES(sort_order);

CREATE TABLE IF NOT EXISTS tags_directory_plan_prices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  -- tags_plans.id en la instalación existente es INT firmado.
  plan_id INT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  manual_month_01 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_02 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_03 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_04 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_05 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_06 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_07 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_08 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_09 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_10 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_11 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_month_12 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_pack_3 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_pack_6 DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_pack_12 DECIMAL(12,2) NOT NULL DEFAULT 0,
  mercadopago_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  settings_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_directory_plan_prices_site_plan (site_id,plan_id),
  KEY idx_directory_plan_prices_active (site_id,is_active),
  KEY idx_directory_plan_prices_plan (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Opcional: el nombre público se deriva del Directorio, pero las capacidades
-- quedan declaradas para que el backend pueda validarlas sin depender del frontend.
CREATE TABLE IF NOT EXISTS tags_directory_plan_features (
  -- Debe coincidir exactamente con tags_plans.id.
  plan_id INT NOT NULL,
  feature_code VARCHAR(80) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (plan_id,feature_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tags_directory_plan_features (plan_id,feature_code)
SELECT id,'directory_web' FROM tags_plans WHERE code='directory_web'
ON DUPLICATE KEY UPDATE is_enabled=1;

INSERT INTO tags_directory_plan_features (plan_id,feature_code)
SELECT id,'directory_reviews' FROM tags_plans WHERE code='directory_web_plus'
ON DUPLICATE KEY UPDATE is_enabled=1;
