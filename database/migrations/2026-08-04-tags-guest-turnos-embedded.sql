CREATE TABLE IF NOT EXISTS tags_guest_turnos_integrations (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 guest_app_id BIGINT UNSIGNED NOT NULL,
 turnos_id BIGINT UNSIGNED NOT NULL,
 service_id BIGINT UNSIGNED NOT NULL,
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 sort_order INT NOT NULL DEFAULT 0,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(id),
 UNIQUE KEY uq_tags_guest_turnos_service(guest_app_id,turnos_id,service_id),
 KEY idx_tags_guest_turnos_integrations_app(guest_app_id,is_active,sort_order),
 KEY idx_tags_guest_turnos_integrations_turnos(turnos_id,service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_turnos_bookings (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 guest_app_id BIGINT UNSIGNED NOT NULL,
 stay_id BIGINT UNSIGNED NOT NULL,
 guest_id BIGINT UNSIGNED NOT NULL,
 turnos_id BIGINT UNSIGNED NOT NULL,
 booking_id BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id),
 UNIQUE KEY uq_tags_guest_turnos_booking(booking_id),
 KEY idx_tags_guest_turnos_bookings_stay(guest_app_id,stay_id,created_at),
 KEY idx_tags_guest_turnos_bookings_guest(guest_id,created_at),
 KEY idx_tags_guest_turnos_bookings_turnos(turnos_id,booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
