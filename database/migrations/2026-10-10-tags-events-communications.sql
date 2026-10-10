-- Historial auditable de comunicaciones de inscripciones a Eventos.
CREATE TABLE tags_event_registration_communications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  registration_id BIGINT UNSIGNED NOT NULL,
  attendee_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('email','whatsapp') NOT NULL,
  communication_type VARCHAR(50) NOT NULL DEFAULT 'confirmation',
  recipient VARCHAR(255) NOT NULL,
  message TEXT NULL,
  delivery_status ENUM('prepared','sent','failed') NOT NULL DEFAULT 'prepared',
  error_message VARCHAR(1000) NULL,
  created_by_type VARCHAR(30) NULL,
  created_by_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_event_registration_communications_event (event_id,created_at),
  KEY idx_event_registration_communications_registration (registration_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
