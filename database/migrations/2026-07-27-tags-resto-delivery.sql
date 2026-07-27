CREATE TABLE IF NOT EXISTS tags_resto_delivery_profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    staff_id BIGINT UNSIGNED NOT NULL,
    employment_type VARCHAR(30) NOT NULL DEFAULT 'employee',
    commission_type VARCHAR(30) NOT NULL DEFAULT 'none',
    fixed_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    percentage DECIMAL(7, 4) NOT NULL DEFAULT 0,
    can_collect TINYINT(1) NOT NULL DEFAULT 1,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    notes VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_delivery_profiles_staff (store_id, staff_id),
    KEY idx_tags_resto_delivery_profiles_status (
        store_id,
        is_active,
        availability_status
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_deliveries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    session_id BIGINT UNSIGNED NOT NULL,
    delivery_profile_id BIGINT UNSIGNED NULL,
    assigned_staff_id BIGINT UNSIGNED NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_confirmation',
    fee_charged_customer DECIMAL(12, 2) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    commission_status VARCHAR(20) NOT NULL DEFAULT 'not_applicable',
    collection_required TINYINT(1) NOT NULL DEFAULT 0,
    amount_to_collect DECIMAL(12, 2) NOT NULL DEFAULT 0,
    collected_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    remitted_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    collection_status VARCHAR(30) NOT NULL DEFAULT 'not_applicable',
    assigned_at DATETIME NULL,
    ready_at DATETIME NULL,
    picked_up_at DATETIME NULL,
    in_transit_at DATETIME NULL,
    delivered_at DATETIME NULL,
    failed_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    delivery_notes VARCHAR(500) NULL,
    issue_notes VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_deliveries_session (session_id),
    KEY idx_tags_resto_deliveries_store_status (store_id, status, created_at),
    KEY idx_tags_resto_deliveries_staff_status (assigned_staff_id, status),
    KEY idx_tags_resto_deliveries_collection (
        store_id,
        collection_status,
        delivered_at
    ),
    KEY idx_tags_resto_deliveries_commission (
        store_id,
        commission_status,
        delivered_at
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_delivery_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    delivery_id BIGINT UNSIGNED NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    from_status VARCHAR(30) NULL,
    to_status VARCHAR(30) NULL,
    actor_staff_id BIGINT UNSIGNED NULL,
    actor_user_id BIGINT UNSIGNED NULL,
    actor_name VARCHAR(190) NULL,
    notes VARCHAR(500) NULL,
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_resto_delivery_events_delivery (delivery_id, created_at),
    KEY idx_tags_resto_delivery_events_store_date (store_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_delivery_remittances (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    delivery_id BIGINT UNSIGNED NOT NULL,
    staff_id BIGINT UNSIGNED NOT NULL,
    cash_shift_id BIGINT UNSIGNED NOT NULL,
    cash_movement_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash',
    notes VARCHAR(500) NULL,
    received_by_user_id BIGINT UNSIGNED NULL,
    received_by_name VARCHAR(190) NULL,
    occurred_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_delivery_remittance_movement (cash_movement_id),
    KEY idx_tags_resto_delivery_remittances_delivery (delivery_id, occurred_at),
    KEY idx_tags_resto_delivery_remittances_staff (staff_id, occurred_at),
    KEY idx_tags_resto_delivery_remittances_shift (cash_shift_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_delivery_settlements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    staff_id BIGINT UNSIGNED NOT NULL,
    cash_shift_id BIGINT UNSIGNED NULL,
    cash_movement_id BIGINT UNSIGNED NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    period_from DATETIME NOT NULL,
    period_to DATETIME NOT NULL,
    commission_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    adjustment_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(30) NULL,
    notes VARCHAR(500) NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    created_by_name VARCHAR(190) NULL,
    paid_by_user_id BIGINT UNSIGNED NULL,
    paid_by_name VARCHAR(190) NULL,
    paid_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_delivery_settlement_movement (cash_movement_id),
    KEY idx_tags_resto_delivery_settlements_staff (
        store_id,
        staff_id,
        status,
        period_to
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_delivery_settlement_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    settlement_id BIGINT UNSIGNED NOT NULL,
    delivery_id BIGINT UNSIGNED NOT NULL,
    commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    adjustment_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_delivery_settlement_item (
        settlement_id,
        delivery_id
    ),
    KEY idx_tags_resto_delivery_settlement_delivery (delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tags_resto_permissions
    (code, module_key, module_name, description)
VALUES
    ('delivery.view', 'delivery', 'Delivery', 'Consultar entregas y repartidores'),
    ('delivery.assign', 'delivery', 'Delivery', 'Asignar y reasignar entregas'),
    ('delivery.status', 'delivery', 'Delivery', 'Actualizar el estado de una entrega'),
    ('delivery.remittance', 'delivery', 'Delivery', 'Registrar rendiciones de cobranzas'),
    ('delivery.settlement', 'delivery', 'Delivery', 'Liquidar y pagar comisiones'),
    ('delivery.manage', 'delivery', 'Delivery', 'Configurar repartidores y comisiones');

INSERT IGNORE INTO tags_resto_roles
    (store_id, code, name, description, is_system, is_active)
SELECT
    s.id,
    'delivery_driver',
    'Repartidor',
    'Entregas asignadas, cobranza y seguimiento',
    1,
    1
FROM tags_stores s
WHERE s.app_type = 'resto';

INSERT IGNORE INTO tags_resto_role_permissions
    (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM tags_resto_roles r
INNER JOIN tags_resto_permissions p
    ON p.code IN (
        'dashboard.view',
        'delivery.view',
        'delivery.status'
    )
WHERE r.code = 'delivery_driver';

INSERT IGNORE INTO tags_resto_role_permissions
    (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM tags_resto_roles r
INNER JOIN tags_resto_permissions p
    ON p.code LIKE 'delivery.%'
WHERE r.code = 'administrator';

INSERT IGNORE INTO tags_resto_role_permissions
    (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM tags_resto_roles r
INNER JOIN tags_resto_permissions p
    ON p.code LIKE 'delivery.%'
WHERE r.code = 'manager';

INSERT IGNORE INTO tags_resto_role_permissions
    (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM tags_resto_roles r
INNER JOIN tags_resto_permissions p
    ON p.code IN (
        'delivery.view',
        'delivery.remittance',
        'delivery.settlement'
    )
WHERE r.code = 'cashier';

INSERT INTO tags_resto_deliveries (
    store_id,
    session_id,
    status,
    collection_required,
    amount_to_collect,
    collection_status,
    created_at,
    updated_at
)
SELECT
    s.store_id,
    s.id,
    CASE
        WHEN s.status IN ('cancelled', 'canceled')
            THEN 'cancelled'
        WHEN s.status IN ('closed', 'completed')
            THEN 'delivered'
        WHEN s.status IN ('paid')
            THEN 'ready_for_dispatch'
        ELSE 'pending_confirmation'
    END,
    CASE
        WHEN COALESCE(s.total, 0) > COALESCE(s.paid_total, 0)
            THEN 1
        ELSE 0
    END,
    GREATEST(
        COALESCE(s.total, 0) - COALESCE(s.paid_total, 0),
        0
    ),
    CASE
        WHEN COALESCE(s.total, 0) > COALESCE(s.paid_total, 0)
            THEN 'pending_collection'
        ELSE 'not_applicable'
    END,
    COALESCE(s.created_at, NOW()),
    NOW()
FROM tags_resto_sessions s
WHERE s.service_mode = 'delivery'
AND NOT EXISTS (
    SELECT 1
    FROM tags_resto_deliveries d
    WHERE d.session_id = s.id
);
