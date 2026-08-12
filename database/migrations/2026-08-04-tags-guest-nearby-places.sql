CREATE TABLE IF NOT EXISTS tags_guest_nearby_categories (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, guest_app_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(120) NOT NULL, icon_code VARCHAR(60) NULL, sort_order INT NOT NULL DEFAULT 0,
 is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(id), UNIQUE KEY uq_guest_nearby_category (guest_app_id,name),
 KEY idx_guest_nearby_category_app (guest_app_id,is_active,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_nearby_places (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, guest_app_id BIGINT UNSIGNED NOT NULL,
 category_id BIGINT UNSIGNED NOT NULL, name VARCHAR(190) NOT NULL, description VARCHAR(1000) NULL,
 image_url VARCHAR(2000) NULL, address VARCHAR(500) NOT NULL, phone VARCHAR(60) NULL,
 whatsapp VARCHAR(60) NULL, latitude DECIMAL(10,7) NOT NULL, longitude DECIMAL(10,7) NOT NULL,
 opening_hours VARCHAR(500) NULL, is_featured TINYINT(1) NOT NULL DEFAULT 0,
 is_active TINYINT(1) NOT NULL DEFAULT 1, sort_order INT NOT NULL DEFAULT 0,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(id), KEY idx_guest_nearby_place_app (guest_app_id,is_active,category_id),
 KEY idx_guest_nearby_place_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
