-- Tags Guest Experience - configuración operativa y redes WiFi
-- Desarrollo autorizado el 2026-08-03. Usar este mismo archivo en producción.

ALTER TABLE tags_guest_stays
    ADD COLUMN expected_arrival_text VARCHAR(120) NULL AFTER arrival_notes;

CREATE TABLE IF NOT EXISTS tags_guest_wifi_networks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guest_app_id BIGINT UNSIGNED NOT NULL,
    sector VARCHAR(190) NOT NULL,
    network_name VARCHAR(190) NOT NULL,
    password VARCHAR(190) NULL,
    instructions VARCHAR(500) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_guest_wifi_app (guest_app_id, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
