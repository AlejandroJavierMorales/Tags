-- Tags Club: agenda de profesores, asignaciones de cancha, economía y liquidaciones.
-- Migración aditiva e idempotente. Ejecutar primero en desarrollo y luego en producción.
-- No declara claves foráneas contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_club_coaches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sports_app_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  display_name VARCHAR(190) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_club_coach_staff (sports_app_id,staff_id),
  UNIQUE KEY uq_tags_club_coach_resource (sports_app_id,resource_id),
  KEY idx_tags_club_coach_business (business_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ventanas máximas que el administrador entrega al profesor sobre una cancha.
CREATE TABLE IF NOT EXISTS tags_club_coach_court_grants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sports_app_id BIGINT UNSIGNED NOT NULL,
  coach_id BIGINT UNSIGNED NOT NULL,
  court_resource_id BIGINT UNSIGNED NOT NULL,
  weekday TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  valid_from DATE NULL,
  valid_until DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tags_club_grant_coach (coach_id,weekday,is_active),
  KEY idx_tags_club_grant_court (court_resource_id,weekday,is_active),
  KEY idx_tags_club_grant_app (sports_app_id,is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Horarios que el profesor decide ofrecer dentro de las ventanas autorizadas.
CREATE TABLE IF NOT EXISTS tags_club_coach_availability (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sports_app_id BIGINT UNSIGNED NOT NULL,
  coach_id BIGINT UNSIGNED NOT NULL,
  grant_id BIGINT UNSIGNED NOT NULL,
  court_resource_id BIGINT UNSIGNED NOT NULL,
  weekday TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  valid_from DATE NULL,
  valid_until DATE NULL,
  slot_interval_minutes INT UNSIGNED NOT NULL DEFAULT 60,
  schedule_rule_id BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tags_club_availability_coach (coach_id,weekday,is_active),
  KEY idx_tags_club_availability_court (court_resource_id,weekday,is_active),
  KEY idx_tags_club_availability_grant (grant_id,is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_club_coach_commission_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sports_app_id BIGINT UNSIGNED NOT NULL,
  coach_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NULL,
  rule_type VARCHAR(30) NOT NULL,
  percentage DECIMAL(7,4) NULL,
  fixed_per_class DECIMAL(12,2) NULL,
  fixed_monthly DECIMAL(12,2) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  valid_from DATE NOT NULL,
  valid_until DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tags_club_commission_coach (coach_id,valid_from,valid_until,is_active),
  KEY idx_tags_club_commission_service (service_id,is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fotografía económica: no se recalcula si luego cambia una regla.
CREATE TABLE IF NOT EXISTS tags_club_booking_economics (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sports_app_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  booking_kind VARCHAR(20) NOT NULL,
  court_resource_id BIGINT UNSIGNED NOT NULL,
  coach_id BIGINT UNSIGNED NULL,
  commission_rule_id BIGINT UNSIGNED NULL,
  gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  coach_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  club_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  settlement_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  occurred_at DATETIME NOT NULL,
  snapshot_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_club_booking_economic (booking_id),
  KEY idx_tags_club_economic_period (sports_app_id,occurred_at),
  KEY idx_tags_club_economic_court (court_resource_id,occurred_at),
  KEY idx_tags_club_economic_coach (coach_id,occurred_at,settlement_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_club_coach_settlements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sports_app_id BIGINT UNSIGNED NOT NULL,
  coach_id BIGINT UNSIGNED NOT NULL,
  period_from DATE NOT NULL,
  period_until DATE NOT NULL,
  variable_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  fixed_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  adjustment_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  paid_at DATETIME NULL,
  payment_method VARCHAR(60) NULL,
  receipt_url VARCHAR(2000) NULL,
  notes TEXT NULL,
  created_by_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tags_club_settlement_coach (coach_id,period_from,period_until),
  KEY idx_tags_club_settlement_status (sports_app_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_club_coach_settlement_items (
  settlement_id BIGINT UNSIGNED NOT NULL,
  booking_economic_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (settlement_id,booking_economic_id),
  UNIQUE KEY uq_tags_club_settlement_economic (booking_economic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tags_turnos_permissions (code,module_key,module_name,description)
VALUES
 ('sports.coach.schedule.view','sports','Tags Club','Ver la agenda propia del profesor'),
 ('sports.coach.schedule.manage','sports','Tags Club','Administrar disponibilidad propia dentro de lo autorizado'),
 ('sports.coach.finance.view','sports','Tags Club','Ver movimientos y liquidaciones propias'),
 ('sports.finance.view','sports','Tags Club','Ver reportes económicos del club'),
 ('sports.finance.manage','sports','Tags Club','Administrar comisiones y liquidaciones')
ON DUPLICATE KEY UPDATE module_name=VALUES(module_name),description=VALUES(description);
