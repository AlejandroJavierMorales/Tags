-- Tags - Equipo y accesos compartidos del negocio
-- Preparada el 2026-09-12.
-- Ejecutar manualmente primero en desarrollo y luego en producción.
-- No modifica tablas ni contratos de Tags Resto.
-- No declara claves foráneas contra tablas legacy.

-- Identidad única de cada colaborador dentro de un negocio.
CREATE TABLE IF NOT EXISTS tags_business_staff (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(60) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    invited_at DATETIME NULL,
    last_access_at DATETIME NULL,
    created_by_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_business_staff_business_email (business_id, email),
    KEY idx_tags_business_staff_business_status (business_id, status),
    KEY idx_tags_business_staff_email_status (email, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Accesos y permisos por producto. Una persona puede trabajar en varias aplicaciones.
-- app_instance_id=0 significa todas las instancias habilitadas de ese producto.
CREATE TABLE IF NOT EXISTS tags_business_staff_app_access (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_id BIGINT UNSIGNED NOT NULL,
    business_id BIGINT UNSIGNED NOT NULL,
    app_code VARCHAR(60) NOT NULL,
    app_instance_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
    role_code VARCHAR(40) NOT NULL DEFAULT 'operator',
    permissions_json JSON NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_business_staff_app (staff_id, app_code, app_instance_id),
    KEY idx_tags_business_staff_app_business (business_id, app_code, status),
    KEY idx_tags_business_staff_app_instance (app_code, app_instance_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enlaces opcionales con empleados de módulos preexistentes.
-- Permite relacionar, por ejemplo, la identidad común con tags_resto_staff
-- sin alterar ni reemplazar las tablas actuales de Resto.
CREATE TABLE IF NOT EXISTS tags_business_staff_legacy_links (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_id BIGINT UNSIGNED NOT NULL,
    business_id BIGINT UNSIGNED NOT NULL,
    module_code VARCHAR(60) NOT NULL,
    legacy_staff_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_business_staff_legacy (module_code, legacy_staff_id),
    UNIQUE KEY uq_tags_business_staff_module_link (staff_id, module_code, legacy_staff_id),
    KEY idx_tags_business_staff_legacy_business (business_id, module_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invitaciones de un solo uso. Se almacena únicamente el hash del token.
CREATE TABLE IF NOT EXISTS tags_business_staff_auth_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_id BIGINT UNSIGNED NOT NULL,
    business_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    requested_ip VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_business_staff_token_hash (token_hash),
    KEY idx_tags_business_staff_token_staff (staff_id, expires_at, used_at),
    KEY idx_tags_business_staff_token_business (business_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
