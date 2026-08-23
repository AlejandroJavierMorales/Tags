-- Beneficios publicados en las fichas Web de Directorio.
-- Ejecutar en desarrollo, verificar y luego aplicar en producción.
-- No reemplaza las tablas tags_benefit_* de Mi Estadía.

CREATE TABLE IF NOT EXISTS tags_directory_benefits (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT NOT NULL,
    site_id BIGINT UNSIGNED NULL,
    listing_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    benefit_type VARCHAR(20) NOT NULL DEFAULT 'amount',
    benefit_value DECIMAL(12,2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    description TEXT NULL,
    image_url VARCHAR(2000) NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_directory_benefits_listing (listing_id, is_active, sort_order),
    KEY idx_directory_benefits_public (site_id, visibility, is_active, valid_from, valid_until),
    KEY idx_directory_benefits_business (business_id, is_active),
    CONSTRAINT fk_directory_benefits_listing FOREIGN KEY (listing_id)
        REFERENCES tags_directory_listings(id) ON DELETE CASCADE,
    CONSTRAINT fk_directory_benefits_site FOREIGN KEY (site_id)
        REFERENCES tags_directory_sites(id) ON DELETE SET NULL,
    CONSTRAINT chk_directory_benefits_type CHECK (benefit_type IN ('amount','percentage')),
    CONSTRAINT chk_directory_benefits_visibility CHECK (visibility IN ('private','public')),
    CONSTRAINT chk_directory_benefits_value CHECK (benefit_value >= 0),
    CONSTRAINT chk_directory_benefits_dates CHECK (valid_until >= valid_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
