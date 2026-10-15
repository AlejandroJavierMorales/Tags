CREATE TABLE IF NOT EXISTS tags_directory_tutorial_groups (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    site_id BIGINT UNSIGNED NOT NULL,
    product_code VARCHAR(80) NOT NULL,
    name VARCHAR(140) NOT NULL,
    description TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tutorial_groups_site_active (site_id,is_active,sort_order),
    KEY idx_tutorial_groups_product (site_id,product_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_directory_tutorials (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    group_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    video_url TEXT NOT NULL,
    video_storage_path VARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status ENUM('draft','published') NOT NULL DEFAULT 'draft',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tutorials_group_public (group_id,status,is_active,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
