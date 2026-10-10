-- Tags Events - Etapa 3: inscripción pública, cupos y confirmación.
-- Ejecutar primero en desarrollo y luego en producción.
-- Las tablas legacy usan INT para events/attendees; por compatibilidad no se declaran FK.

CREATE TABLE IF NOT EXISTS tags_event_registration_settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id INT NOT NULL,
    public_slug VARCHAR(190) NOT NULL,
    registration_enabled TINYINT(1) NOT NULL DEFAULT 0,
    confirmation_mode ENUM('automatic','manual') NOT NULL DEFAULT 'manual',
    capacity INT UNSIGNED NULL,
    registration_opens_at DATETIME NULL,
    registration_closes_at DATETIME NULL,
    public_title VARCHAR(255) NULL,
    public_description TEXT NULL,
    success_message TEXT NULL,
    require_phone TINYINT(1) NOT NULL DEFAULT 1,
    terms_text TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_registration_settings_event (event_id),
    UNIQUE KEY uq_event_registration_settings_slug (public_slug),
    KEY idx_event_registration_settings_enabled (registration_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_event_registrations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id INT NOT NULL,
    attendee_id INT NOT NULL,
    access_token_hash CHAR(64) NOT NULL,
    source VARCHAR(40) NOT NULL DEFAULT 'public_web',
    seats INT UNSIGNED NOT NULL DEFAULT 1,
    accepted_terms_at DATETIME NULL,
    requester_ip VARCHAR(64) NULL,
    requester_user_agent VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_registrations_attendee (attendee_id),
    UNIQUE KEY uq_event_registrations_token (access_token_hash),
    KEY idx_event_registrations_event (event_id),
    KEY idx_event_registrations_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
