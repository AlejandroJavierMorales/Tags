CREATE TABLE IF NOT EXISTS tags_resto_cash_registers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(60) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_cash_register_store_code (store_id, code),
    KEY idx_tags_resto_cash_register_store_active (store_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_cash_shifts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    cash_register_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    opening_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expected_cash DECIMAL(12, 2) NULL,
    declared_cash DECIMAL(12, 2) NULL,
    difference_amount DECIMAL(12, 2) NULL,
    opening_notes VARCHAR(500) NULL,
    closing_notes VARCHAR(500) NULL,
    opened_by_user_id BIGINT UNSIGNED NULL,
    opened_by_name VARCHAR(190) NULL,
    closed_by_user_id BIGINT UNSIGNED NULL,
    closed_by_name VARCHAR(190) NULL,
    opened_at DATETIME NOT NULL,
    closed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_resto_cash_shifts_store_status (store_id, status),
    KEY idx_tags_resto_cash_shifts_register_date (cash_register_id, opened_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_resto_cash_movements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    cash_shift_id BIGINT UNSIGNED NOT NULL,
    session_id BIGINT UNSIGNED NULL,
    payment_id BIGINT UNSIGNED NULL,
    refund_id BIGINT UNSIGNED NULL,
    movement_type VARCHAR(40) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    notes VARCHAR(500) NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    created_by_name VARCHAR(190) NULL,
    occurred_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_resto_cash_movement_payment (payment_id),
    UNIQUE KEY uq_tags_resto_cash_movement_refund (refund_id),
    KEY idx_tags_resto_cash_movements_shift_date (cash_shift_id, occurred_at),
    KEY idx_tags_resto_cash_movements_store_date (store_id, occurred_at),
    KEY idx_tags_resto_cash_movements_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tags_resto_cash_registers (
    store_id,
    name,
    code,
    is_active,
    created_at,
    updated_at
)
SELECT
    s.id,
    'Caja principal',
    'principal',
    1,
    NOW(),
    NOW()
FROM tags_stores s
WHERE s.app_type = 'resto'
AND NOT EXISTS (
    SELECT 1
    FROM tags_resto_cash_registers cr
    WHERE cr.store_id = s.id
    AND cr.code = 'principal'
);
