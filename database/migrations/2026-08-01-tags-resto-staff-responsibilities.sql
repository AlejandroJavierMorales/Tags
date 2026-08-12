-- Tags Resto: asignación de mesas y preferencias de notificaciones del personal.
-- La migración es idempotente y no modifica datos operativos existentes.

CREATE TABLE IF NOT EXISTS tags_resto_staff_location_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    staff_id BIGINT UNSIGNED NOT NULL,
    location_id INT NOT NULL,
    assignment_type ENUM('permanent') NOT NULL DEFAULT 'permanent',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resto_staff_location_assignment (store_id, staff_id, location_id, assignment_type),
    KEY idx_resto_staff_location_assignments_staff (store_id, staff_id, is_active),
    KEY idx_resto_staff_location_assignments_location (store_id, location_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_staff_notification_preferences (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    staff_id BIGINT UNSIGNED NOT NULL,
    notification_code VARCHAR(80) NOT NULL,
    scope ENUM('none', 'assigned', 'all', 'unassigned') NOT NULL DEFAULT 'none',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resto_staff_notification_preference (store_id, staff_id, notification_code),
    KEY idx_resto_staff_notification_preferences_staff (store_id, staff_id),
    KEY idx_resto_staff_notification_preferences_code (store_id, notification_code, scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
