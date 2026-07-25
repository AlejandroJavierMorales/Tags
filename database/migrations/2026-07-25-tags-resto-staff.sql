CREATE TABLE IF NOT EXISTS tags_resto_permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(100) NOT NULL,
    module_key VARCHAR(50) NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    description VARCHAR(190) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_permissions_code (code),
    KEY idx_tags_resto_permissions_module (module_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(60) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_roles_store_code (store_id, code),
    KEY idx_tags_resto_roles_store_active (store_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    KEY idx_tags_resto_role_permissions_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_staff (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NULL,
    name VARCHAR(190) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(60) NULL,
    photo_url VARCHAR(500) NULL,
    notes VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_access_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_staff_store_email (store_id, email),
    KEY idx_tags_resto_staff_store_status (store_id, status),
    KEY idx_tags_resto_staff_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_staff_permission_overrides (
    staff_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    effect VARCHAR(10) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (staff_id, permission_id),
    KEY idx_tags_resto_staff_overrides_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_staff_auth_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_id BIGINT UNSIGNED NOT NULL,
    store_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    requested_ip VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_staff_tokens_hash (token_hash),
    KEY idx_tags_resto_staff_tokens_staff (staff_id, expires_at),
    KEY idx_tags_resto_staff_tokens_store (store_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    staff_id BIGINT UNSIGNED NULL,
    actor_type VARCHAR(30) NOT NULL,
    actor_name VARCHAR(190) NULL,
    action_code VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NULL,
    entity_id BIGINT UNSIGNED NULL,
    description VARCHAR(500) NULL,
    metadata_json JSON NULL,
    ip_address VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_resto_audit_store_date (store_id, created_at),
    KEY idx_tags_resto_audit_staff_date (staff_id, created_at),
    KEY idx_tags_resto_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tags_resto_permissions
    (code, module_key, module_name, description)
VALUES
    ('dashboard.view', 'dashboard', 'Inicio', 'Acceder al panel operativo'),
    ('cash.view', 'cash', 'Caja', 'Consultar la caja y sus movimientos'),
    ('cash.open', 'cash', 'Caja', 'Abrir una caja'),
    ('cash.movement', 'cash', 'Caja', 'Registrar ingresos y egresos'),
    ('cash.charge', 'cash', 'Caja', 'Registrar cobros'),
    ('cash.refund', 'cash', 'Caja', 'Registrar devoluciones'),
    ('cash.close', 'cash', 'Caja', 'Cerrar y realizar el arqueo de caja'),
    ('tables.view', 'tables', 'Mesas', 'Consultar el estado de las mesas'),
    ('tables.open', 'tables', 'Mesas', 'Abrir y habilitar mesas'),
    ('tables.close', 'tables', 'Mesas', 'Cerrar mesas'),
    ('tables.cancel', 'tables', 'Mesas', 'Cancelar sesiones de mesa'),
    ('orders.view', 'orders', 'Pedidos', 'Consultar pedidos'),
    ('orders.items', 'orders', 'Pedidos', 'Agregar, quitar y modificar productos'),
    ('orders.cancel', 'orders', 'Pedidos', 'Cancelar pedidos o productos'),
    ('orders.deliver', 'orders', 'Pedidos', 'Marcar pedidos o productos como entregados'),
    ('orders.payment', 'orders', 'Pedidos', 'Registrar cobros desde pedidos'),
    ('kitchen.view', 'kitchen', 'Cocina', 'Consultar la pantalla de cocina'),
    ('kitchen.ready', 'kitchen', 'Cocina', 'Marcar productos como listos'),
    ('waiter.view', 'waiter', 'Mozo', 'Consultar la pantalla de mozo'),
    ('waiter.resolve', 'waiter', 'Mozo', 'Atender llamados y solicitudes de cuenta'),
    ('waiter.serve', 'waiter', 'Mozo', 'Marcar productos como entregados'),
    ('history.view', 'history', 'Historial', 'Consultar el historial de pedidos'),
    ('products.view', 'products', 'Productos', 'Consultar productos'),
    ('products.manage', 'products', 'Productos', 'Crear, editar y eliminar productos'),
    ('categories.view', 'categories', 'Categorías', 'Consultar categorías'),
    ('categories.manage', 'categories', 'Categorías', 'Crear, editar y eliminar categorías'),
    ('locations.view', 'locations', 'Sectores y mesas', 'Consultar sectores, mesas y QR'),
    ('locations.manage', 'locations', 'Sectores y mesas', 'Crear, editar y eliminar sectores y mesas'),
    ('settings.view', 'settings', 'Configuración', 'Consultar la configuración del restaurante'),
    ('settings.manage', 'settings', 'Configuración', 'Modificar la configuración del restaurante'),
    ('publish.manage', 'settings', 'Configuración', 'Publicar y despublicar el restaurante'),
    ('staff.view', 'staff', 'Personal', 'Consultar empleados, roles y permisos'),
    ('staff.manage', 'staff', 'Personal', 'Crear y modificar empleados, roles y permisos'),
    ('audit.view', 'staff', 'Personal', 'Consultar el registro de actividad');

INSERT IGNORE INTO tags_resto_roles
    (store_id, code, name, description, is_system, is_active)
SELECT
    s.id,
    role_seed.code,
    role_seed.name,
    role_seed.description,
    1,
    1
FROM tags_stores s
CROSS JOIN (
    SELECT 'administrator' AS code, 'Administrador' AS name, 'Acceso completo al restaurante' AS description
    UNION ALL
    SELECT 'manager', 'Encargado', 'Gestión operativa y administrativa diaria'
    UNION ALL
    SELECT 'waiter', 'Mozo', 'Mesas, pedidos, entregas y atención'
    UNION ALL
    SELECT 'kitchen', 'Cocina', 'Preparación y estado de productos'
    UNION ALL
    SELECT 'cashier', 'Caja', 'Cobros, devoluciones y arqueos'
) role_seed
WHERE s.app_type = 'resto';

INSERT IGNORE INTO tags_resto_role_permissions
    (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM tags_resto_roles r
CROSS JOIN tags_resto_permissions p
WHERE r.code = 'administrator';

INSERT IGNORE INTO tags_resto_role_permissions
    (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM tags_resto_roles r
CROSS JOIN tags_resto_permissions p
WHERE r.code = 'manager'
AND p.code NOT IN (
    'staff.manage',
    'settings.manage',
    'publish.manage'
);

INSERT IGNORE INTO tags_resto_role_permissions
    (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM tags_resto_roles r
CROSS JOIN tags_resto_permissions p
WHERE r.code = 'waiter'
AND p.code IN (
    'dashboard.view',
    'tables.view',
    'tables.open',
    'tables.close',
    'orders.view',
    'orders.deliver',
    'orders.payment',
    'kitchen.view',
    'waiter.view',
    'waiter.resolve',
    'waiter.serve'
);

INSERT IGNORE INTO tags_resto_role_permissions
    (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM tags_resto_roles r
CROSS JOIN tags_resto_permissions p
WHERE r.code = 'kitchen'
AND p.code IN (
    'dashboard.view',
    'orders.view',
    'kitchen.view',
    'kitchen.ready'
);

INSERT IGNORE INTO tags_resto_role_permissions
    (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM tags_resto_roles r
CROSS JOIN tags_resto_permissions p
WHERE r.code = 'cashier'
AND p.code IN (
    'dashboard.view',
    'cash.view',
    'cash.open',
    'cash.movement',
    'cash.charge',
    'cash.refund',
    'cash.close',
    'tables.view',
    'tables.close',
    'orders.view',
    'orders.payment',
    'history.view'
);

INSERT IGNORE INTO tags_resto_staff
    (store_id, role_id, name, email, status)
SELECT
    s.id,
    r.id,
    staff_seed.name,
    staff_seed.email,
    'active'
FROM tags_stores s
CROSS JOIN (
    SELECT 'manager' AS role_code, 'Prueba Encargado' AS name, 'ventas.ecosistema@gmail.com' AS email
    UNION ALL
    SELECT 'waiter', 'Prueba Mozo', 'ingematec.ar@gmail.com'
    UNION ALL
    SELECT 'kitchen', 'Prueba Cocina', 'cabanasenlosreartes@gmail.com'
    UNION ALL
    SELECT 'cashier', 'Prueba Caja', 'info@tags.com.ar'
    UNION ALL
    SELECT 'administrator', 'Prueba Administrador', 'info@calamuchita.ar'
) staff_seed
INNER JOIN tags_resto_roles r
    ON r.store_id = s.id
    AND r.code = staff_seed.role_code
WHERE s.business_id = 16
AND s.app_type = 'resto';
