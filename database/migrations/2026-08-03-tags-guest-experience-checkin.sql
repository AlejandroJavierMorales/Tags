-- Tags Guest Experience - Reserva, pre-check-in y check-in
-- Preparada el 2026-08-03. NO EJECUTAR SIN AUTORIZACIÓN EXPLÍCITA.

CREATE TABLE IF NOT EXISTS tags_guest_precheckins (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guest_app_id BIGINT UNSIGNED NOT NULL,
    stay_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    vehicle_plate VARCHAR(30) NULL,
    vehicle_make_model VARCHAR(190) NULL,
    vehicle_color VARCHAR(80) NULL,
    estimated_arrival_at DATETIME NULL,
    guest_notes TEXT NULL,
    internal_notes TEXT NULL,
    submitted_at DATETIME NULL,
    checked_in_at DATETIME NULL,
    checked_in_by_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_guest_precheckins_stay (stay_id),
    KEY idx_tags_guest_precheckins_app_status (guest_app_id, status, submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Los acompañantes continúan en tags_guest_people + tags_guest_stay_people.
-- Nombre, apellido y DNI son validados por aplicación; `name` conserva el nombre completo.
